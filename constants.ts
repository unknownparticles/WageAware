
import { Settings, WorkScheduleType, Holiday } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  monthlySalary: 0,
  scheduleType: WorkScheduleType.DoubleWeekend,
  workStartTime: "09:00",
  workEndTime: "18:00",
  hasLunchBreak: true,
  lunchStartTime: "12:00",
  lunchEndTime: "13:00",
  holidays: [],
  isConfigured: false,
};

export const SCHEDULE_LABELS = {
  [WorkScheduleType.DoubleWeekend]: '双休',
  [WorkScheduleType.SingleWeekend]: '单休',
  [WorkScheduleType.NoWeekend]: '无休',
};

export const STORAGE_KEYS = {
  SETTINGS: 'wageaware_settings',
  CURRENT_SESSION: 'wageaware_current_session',
  HISTORY: 'wageaware_history',
};

export const CHINA_HOLIDAYS_PRESET: Omit<Holiday, 'id'>[] = [
    // 2024
    { date: '2024-01-01', name: '元旦' },
    { date: '2024-02-10', name: '春节' },
    { date: '2024-02-11', name: '春节' },
    { date: '2024-02-12', name: '春节' },
    { date: '2024-02-13', name: '春节' },
    { date: '2024-02-14', name: '春节' },
    { date: '2024-02-15', name: '春节' },
    { date: '2024-02-16', name: '春节' },
    { date: '2024-02-17', name: '春节' },
    { date: '2024-04-04', name: '清明节' },
    { date: '2024-04-05', name: '清明节' },
    { date: '2024-04-06', name: '清明节' },
    { date: '2024-05-01', name: '劳动节' },
    { date: '2024-05-02', name: '劳动节' },
    { date: '2024-05-03', name: '劳动节' },
    { date: '2024-05-04', name: '劳动节' },
    { date: '2024-05-05', name: '劳动节' },
    { date: '2024-06-10', name: '端午节' },
    { date: '2024-09-15', name: '中秋节' },
    { date: '2024-09-16', name: '中秋节' },
    { date: '2024-09-17', name: '中秋节' },
    { date: '2024-10-01', name: '国庆节' },
    { date: '2024-10-02', name: '国庆节' },
    { date: '2024-10-03', name: '国庆节' },
    { date: '2024-10-04', name: '国庆节' },
    { date: '2024-10-05', name: '国庆节' },
    { date: '2024-10-06', name: '国庆节' },
    { date: '2024-10-07', name: '国庆节' },
    // 2025 (Partial/Estimated)
    { date: '2025-01-01', name: '元旦' },
    { date: '2025-01-28', name: '除夕' },
    { date: '2025-01-29', name: '春节' },
    { date: '2025-01-30', name: '春节' },
    { date: '2025-01-31', name: '春节' },
    { date: '2025-02-01', name: '春节' },
    { date: '2025-02-02', name: '春节' },
    { date: '2025-02-03', name: '春节' },
    { date: '2025-02-04', name: '春节' },
    { date: '2025-04-04', name: '清明节' },
    { date: '2025-05-01', name: '劳动节' },
    { date: '2025-05-31', name: '端午节' },
    { date: '2025-10-01', name: '国庆节' },
    { date: '2025-10-06', name: '中秋节' },
];
