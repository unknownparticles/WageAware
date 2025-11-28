

import React, { useState } from 'react';
import { DailyStat, Settings } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Clock, CalendarCheck } from 'lucide-react';

interface Props {
  history: DailyStat[];
  settings: Settings;
}

export const CalendarView: React.FC<Props> = ({ history, settings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(val);
  const formatFullCurrency = (val: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const getDayData = (date: Date) => {
    const stats = history.filter(h => isSameDay(new Date(h.date), date));
    const totalEarned = stats.reduce((acc, curr) => acc + curr.earnedAmount, 0);
    const totalDuration = stats.reduce((acc, curr) => acc + curr.totalDurationMs, 0);

    // Check if it's a holiday
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = settings.holidays.find(h => h.date === dateStr);

    return {
      stats,
      totalEarned,
      totalDuration,
      holiday,
      hasWork: stats.some(s => s.type === 'work'),
      hasLeave: stats.some(s => s.type === 'leave'),
    };
  };

  const getIntensityColor = (earned: number) => {
    if (earned <= 0) return '';
    // Simple scaling based on assumption of salary. 
    // This could be relative to daily salary.
    // Let's assume average daily salary.
    const approximateDaily = settings.monthlySalary / 21.75;
    const ratio = earned / approximateDaily;

    if (ratio < 0.5) return 'bg-emerald-900/40 text-emerald-200';
    if (ratio < 1.0) return 'bg-emerald-800/60 text-emerald-100';
    if (ratio >= 1.0) return 'bg-emerald-600 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]';
    return 'bg-emerald-500 text-white font-bold';
  };

  // Render Details Modal
  const renderDetails = () => {
    if (!selectedDay) return null;
    const { stats, totalEarned, totalDuration, holiday } = getDayData(selectedDay);

    return (
      <div className="absolute inset-0 bg-dark/90 backdrop-blur-sm z-50 p-6 flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-surface w-full max-w-sm rounded-xl border border-gray-700 shadow-2xl p-6 relative">
          <button
            onClick={() => setSelectedDay(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-white"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-1">
              {format(selectedDay, 'MM月dd日')}
            </h3>
            <p className="text-gray-400 text-sm">
              {format(selectedDay, 'yyyy')} · {format(selectedDay, 'EEEE')}
            </p>
            {holiday && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-red-900/50 border border-red-500 text-red-200 text-xs">
                {holiday.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-dark p-3 rounded-lg border border-gray-700 text-center">
              <p className="text-xs text-gray-500 mb-1">总收益</p>
              <p className="text-lg font-mono text-emerald-400 font-bold">
                {formatFullCurrency(totalEarned)}
              </p>
            </div>
            <div className="bg-dark p-3 rounded-lg border border-gray-700 text-center">
              <p className="text-xs text-gray-500 mb-1">总时长</p>
              <p className="text-lg font-mono text-white font-bold">
                {(totalDuration / 1000 / 60 / 60).toFixed(1)} 小时
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {stats.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-4">本日无记录</p>
            )}
            {stats.map((stat, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-dark/50 rounded border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${stat.type === 'leave' ? 'bg-blue-900/30 text-blue-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                    {stat.type === 'leave' ? <CalendarCheck size={16} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">
                      {stat.type === 'leave' ? (stat.note || '请假') : '工作打卡'}
                    </p>
                    <p className="text-xs text-gray-500">
                      时长: {(stat.totalDurationMs / 1000 / 60 / 60).toFixed(1)}h
                      {stat.overtimeDurationMs > 0 && <span className="text-red-400 ml-1">(加班 {(stat.overtimeDurationMs / 1000 / 60).toFixed(0)}m)</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-white">{formatCurrency(stat.earnedAmount)}</p>
                  <p className="text-[10px] text-gray-500">¥{stat.effectiveHourlyRate.toFixed(0)}/h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 relative">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-surface rounded-full text-gray-400 hover:text-white">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">{format(currentDate, 'yyyy年 MM月')}</h2>
        </div>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-surface rounded-full text-gray-400 hover:text-white">
          <ChevronRight />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 flex-1 auto-rows-fr">
        {calendarDays.map((day) => {
          const { totalEarned, holiday, hasLeave } = getDayData(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          // Visual Styles
          let bgClass = 'bg-surface/30';
          if (isCurrentMonth) bgClass = 'bg-surface hover:bg-gray-700';

          // Heatmap / Status Logic
          if (isCurrentMonth && totalEarned > 0) {
            bgClass = getIntensityColor(totalEarned);
          } else if (isCurrentMonth && hasLeave) {
            bgClass = 'bg-blue-900/20 border border-blue-800 text-blue-200';
          }

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`
                        relative rounded-lg p-1 md:p-2 cursor-pointer transition-all border border-transparent
                        flex flex-col justify-between min-h-[60px] md:min-h-[80px]
                        ${bgClass}
                        ${isTodayDate ? 'ring-2 ring-primary ring-offset-2 ring-offset-dark' : ''}
                        ${!isCurrentMonth ? 'opacity-30 grayscale' : ''}
                    `}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-medium ${isTodayDate ? 'text-primary' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </span>
                {holiday && (
                  <span className="text-[10px] text-red-400 font-bold transform scale-90 origin-top-right">
                    {holiday.name}
                  </span>
                )}
              </div>

              {totalEarned > 0 && (
                <div className="mt-auto text-right">
                  <p className="text-[10px] md:text-xs font-mono font-bold">
                    {formatCurrency(totalEarned)}
                  </p>
                </div>
              )}

              {hasLeave && totalEarned === 0 && (
                <div className="mt-auto text-right">
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 rounded">假</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend / Footer Info */}
      <div className="mt-4 flex justify-between text-[10px] text-gray-500">
        <div className="flex gap-2 items-center">
          <span className="w-3 h-3 bg-surface rounded border border-gray-700"></span> 无记录
          <span className="w-3 h-3 bg-emerald-900/40 rounded"></span> 低收益
          <span className="w-3 h-3 bg-emerald-500 rounded"></span> 高收益
        </div>
        <div>
          点击日期查看详情
        </div>
      </div>

      {renderDetails()}
    </div>
  );
};
