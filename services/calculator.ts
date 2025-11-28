
import { Settings, WorkScheduleType, Holiday } from "../types";
import { format, getDaysInMonth, isSaturday, isSunday, parse, addDays } from "date-fns";

// Parse "HH:mm" to minutes from midnight
export const parseTimeStr = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Get total minutes in the configured work day (excluding lunch)
export const getStandardWorkMinutes = (settings: Settings): number => {
  const start = parseTimeStr(settings.workStartTime);
  const end = parseTimeStr(settings.workEndTime);
  let duration = end - start;

  // Handle overnight shifts (e.g. 22:00 to 06:00)
  if (duration < 0) duration += 24 * 60;

  if (settings.hasLunchBreak) {
    const lunchStart = parseTimeStr(settings.lunchStartTime);
    const lunchEnd = parseTimeStr(settings.lunchEndTime);
    let lunchDuration = lunchEnd - lunchStart;
    if (lunchDuration < 0) lunchDuration += 24 * 60;
    duration -= lunchDuration;
  }

  return duration > 0 ? duration : 0;
};

// Check if a specific date is a configured holiday
const isHoliday = (date: Date, holidays: Holiday[]): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.some(h => h.date === dateStr);
};

// Calculate working days in a specific month based on schedule and holidays
export const getWorkingDaysInMonth = (date: Date, type: WorkScheduleType, holidays: Holiday[] = []): number => {
  const daysInMonth = getDaysInMonth(date);
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const current = new Date(date.getFullYear(), date.getMonth(), day);

    // If it's a holiday, it counts as a non-working day regardless of weekend status
    if (isHoliday(current, holidays)) {
      continue;
    }

    if (type === WorkScheduleType.NoWeekend) {
      workingDays++;
    } else if (type === WorkScheduleType.SingleWeekend) {
      if (!isSunday(current)) workingDays++;
    } else {
      // DoubleWeekend
      if (!isSaturday(current) && !isSunday(current)) workingDays++;
    }
  }
  return workingDays || 1; // Avoid division by zero
};

// Helper to get base rates
export const getRates = (settings: Settings, date: Date = new Date()) => {
  const workingDays = getWorkingDaysInMonth(date, settings.scheduleType, settings.holidays);
  const dailySalary = settings.monthlySalary / workingDays;
  const standardMinutes = getStandardWorkMinutes(settings);
  const standardHourlyRate = dailySalary / (standardMinutes / 60);

  return { dailySalary, standardHourlyRate, standardMinutes };
};

// Main calculation for the live ticker
export const calculateLiveMetrics = (
  settings: Settings,
  startTime: number,
  now: number
) => {
  const startDate = new Date(startTime);
  const { dailySalary, standardHourlyRate } = getRates(settings, startDate);

  // Normalize times to today's date for comparison
  const today = new Date(now);
  const workStart = parse(settings.workStartTime, "HH:mm", today);
  const workEnd = parse(settings.workEndTime, "HH:mm", today);

  let endTimeDate = workEnd;
  if (workEnd < workStart) {
    endTimeDate = new Date(workEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  const currentWorkDurationMs = now - startTime;
  const currentWorkMinutes = currentWorkDurationMs / 1000 / 60;

  // Calculate actual worked minutes (deducting lunch if passed)
  let workedMinutes = currentWorkMinutes;

  if (settings.hasLunchBreak) {
    const lunchStart = parse(settings.lunchStartTime, "HH:mm", today);
    const lunchEnd = parse(settings.lunchEndTime, "HH:mm", today);

    const nowTime = now;
    const lunchStartTime = lunchStart.getTime();
    const lunchEndTime = lunchEnd.getTime();

    if (startTime < lunchStartTime && nowTime > lunchStartTime) {
      if (nowTime < lunchEndTime) {
        workedMinutes = (lunchStartTime - startTime) / 1000 / 60;
      } else {
        const lunchDurationMin = (lunchEndTime - lunchStartTime) / 1000 / 60;
        workedMinutes -= lunchDurationMin;
      }
    } else if (startTime >= lunchStartTime && startTime < lunchEndTime) {
      if (nowTime > lunchEndTime) {
        workedMinutes = (nowTime - lunchEndTime) / 1000 / 60;
      } else {
        workedMinutes = 0;
      }
    }
  }

  const isOvertime = now > endTimeDate.getTime();

  let moneyEarned = 0;
  let displayRate = standardHourlyRate;

  if (!isOvertime) {
    const validMinutes = Math.max(0, workedMinutes);
    moneyEarned = (validMinutes / 60) * standardHourlyRate;
  } else {
    // Overtime: Money capped at daily salary, rate decreases
    moneyEarned = dailySalary;
    const totalHoursWorked = Math.max(0.1, workedMinutes / 60);
    displayRate = dailySalary / totalHoursWorked;
  }

  return {
    moneyEarned,
    displayRate,
    isOvertime,
    workedMinutes,
    standardHourlyRate
  };
};

// Calculate leave value
export const calculateLeaveValue = (
  settings: Settings,
  startStr: string, // HH:mm
  endStr: string,   // HH:mm
  ratio: number
) => {
  const { standardHourlyRate } = getRates(settings);

  const start = parseTimeStr(startStr);
  const end = parseTimeStr(endStr);

  // Calculate raw duration in minutes
  let duration = end - start;
  if (duration < 0) duration += 24 * 60; // overnight check

  // Subtract lunch if applicable
  if (settings.hasLunchBreak) {
    const lunchStart = parseTimeStr(settings.lunchStartTime);
    const lunchEnd = parseTimeStr(settings.lunchEndTime);

    // Simple overlap check: assumes leave happens within a single day
    const leaveInterval = { start, end };
    const lunchInterval = { start: lunchStart, end: lunchEnd };

    const overlapStart = Math.max(leaveInterval.start, lunchInterval.start);
    const overlapEnd = Math.min(leaveInterval.end, lunchInterval.end);

    if (overlapEnd > overlapStart) {
      duration -= (overlapEnd - overlapStart);
    }
  }

  const hours = duration / 60;
  const earned = hours * standardHourlyRate * ratio;

  return {
    earnedAmount: earned,
    durationMs: duration * 60 * 1000,
    hourlyRate: standardHourlyRate * ratio // Effective rate for this period
  };
};

// Calculate manual work entry value (missed punch)
export const calculateManualWorkValue = (
  settings: Settings,
  dateStr: string, // YYYY-MM-DD
  startStr: string, // HH:mm
  endStr: string // HH:mm
) => {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());

  // Construct timestamps
  const start = parse(startStr, 'HH:mm', date);
  let end = parse(endStr, 'HH:mm', date);

  // Handle overnight if end time is smaller than start time
  if (end < start) {
    end = addDays(end, 1);
  }

  // Reuse the live metrics logic
  const metrics = calculateLiveMetrics(settings, start.getTime(), end.getTime());

  // Recalculate overtime duration for stats
  // Standard End Time for that specific day
  const standardEnd = parse(settings.workEndTime, 'HH:mm', date);
  let standardEndTime = standardEnd.getTime();
  if (standardEnd < start) {
    // If shift starts late, standard end might be next day
    standardEndTime += 24 * 60 * 60 * 1000;
  }

  const overtimeDurationMs = Math.max(0, end.getTime() - standardEndTime);

  return {
    earnedAmount: metrics.moneyEarned,
    effectiveHourlyRate: metrics.displayRate,
    totalDurationMs: end.getTime() - start.getTime(),
    overtimeDurationMs
  };
};
