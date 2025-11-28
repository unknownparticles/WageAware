
export enum WorkScheduleType {
  DoubleWeekend = 'DoubleWeekend', // 双休
  SingleWeekend = 'SingleWeekend', // 单休
  NoWeekend = 'NoWeekend', // 无休
}

export interface TimeString {
  hour: number;
  minute: number;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface Settings {
  monthlySalary: number;
  scheduleType: WorkScheduleType;
  workStartTime: string; // "HH:mm"
  workEndTime: string; // "HH:mm"
  hasLunchBreak: boolean;
  lunchStartTime: string; // "HH:mm"
  lunchEndTime: string; // "HH:mm"
  holidays: Holiday[];
  isConfigured: boolean;
}

export interface WorkSession {
  id: string;
  date: string; // ISO Date YYYY-MM-DD
  startTime: number; // Timestamp
  endTime: number | null; // Timestamp
  lastPauseTime?: number; // Timestamp
}

export interface DailyStat {
  date: string;
  totalDurationMs: number;
  overtimeDurationMs: number;
  earnedAmount: number; // Calculated finalized amount
  effectiveHourlyRate: number;
  type?: 'work' | 'leave'; // To distinguish regular work from leave
  note?: string; // e.g., "Sick Leave"
}

export type ViewState = 'tracker' | 'stats' | 'settings' | 'calendar';
