
import React, { useEffect, useState, useRef } from 'react';
import { Settings, WorkSession } from '../types';
import { calculateLiveMetrics, calculateLeaveValue, calculateManualWorkValue } from '../services/calculator';
import { Play, Square, Clock, Coffee, Briefcase, Thermometer, X, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  settings: Settings;
  currentSession: WorkSession | null;
  onStart: () => void;
  onStop: (earned: number, rate: number) => void;
  onLeave: (earned: number, durationMs: number, type: string, rate: number) => void;
  onManualWork: (date: string, earned: number, durationMs: number, overtimeMs: number, rate: number) => void;
}

type EntryType = 'Annual' | 'Sick' | 'Personal' | 'Work';

export const Tracker: React.FC<Props> = ({ settings, currentSession, onStart, onStop, onLeave, onManualWork }) => {
  const [now, setNow] = useState(Date.now());
  const [metrics, setMetrics] = useState({
    moneyEarned: 0,
    displayRate: 0,
    isOvertime: false,
    workedMinutes: 0
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('Annual');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryStart, setEntryStart] = useState(settings.workStartTime);
  const [entryEnd, setEntryEnd] = useState(settings.workEndTime);
  const [leaveRatio, setLeaveRatio] = useState(1.0);

  const requestRef = useRef<number>();

  const tick = () => {
    setNow(Date.now());
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (currentSession) {
      requestRef.current = requestAnimationFrame(tick);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setMetrics({
        moneyEarned: 0,
        displayRate: 0,
        isOvertime: false,
        workedMinutes: 0
      });
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentSession]);

  useEffect(() => {
    if (currentSession) {
      const result = calculateLiveMetrics(settings, currentSession.startTime, now);
      setMetrics(result);
    }
  }, [now, settings, currentSession]);

  const handleStop = () => {
    if (currentSession) {
      const finalMetrics = calculateLiveMetrics(settings, currentSession.startTime, Date.now());
      onStop(finalMetrics.moneyEarned, finalMetrics.displayRate);
    }
  };

  // Modal Handlers
  const openModal = (type: EntryType) => {
    setEntryType(type);
    setEntryDate(format(new Date(), 'yyyy-MM-dd'));
    if (type === 'Work') {
        // Default to settings for work
        setEntryStart(settings.workStartTime);
        setEntryEnd(settings.workEndTime);
    } else {
        // Default to settings for leave as well
        setEntryStart(settings.workStartTime);
        setEntryEnd(settings.workEndTime);
        
        if (type === 'Annual') setLeaveRatio(1.0);
        if (type === 'Sick') setLeaveRatio(0.8);
        if (type === 'Personal') setLeaveRatio(0);
    }
    setShowModal(true);
  };

  const submitEntry = () => {
    if (entryType === 'Work') {
        const result = calculateManualWorkValue(settings, entryDate, entryStart, entryEnd);
        onManualWork(entryDate, result.earnedAmount, result.totalDurationMs, result.overtimeDurationMs, result.effectiveHourlyRate);
    } else {
        const result = calculateLeaveValue(settings, entryStart, entryEnd, leaveRatio);
        let note = '';
        if (entryType === 'Annual') note = '年假';
        if (entryType === 'Sick') note = '病假';
        if (entryType === 'Personal') note = '事假';
        
        onLeave(result.earnedAmount, result.durationMs, note, result.hourlyRate);
    }
    setShowModal(false);
  };

  const getPreviewAmount = () => {
    if (entryType === 'Work') {
        return calculateManualWorkValue(settings, entryDate, entryStart, entryEnd).earnedAmount;
    } else {
        return calculateLeaveValue(settings, entryStart, entryEnd, leaveRatio).earnedAmount;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY', 
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(val);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${hours}小时 ${minutes}分 ${seconds}秒`;
  };

  const getModalTitle = () => {
      switch(entryType) {
          case 'Work': return '补卡 (手动记录工时)';
          case 'Annual': return '记录年假';
          case 'Sick': return '记录病假';
          case 'Personal': return '记录事假';
          default: return '';
      }
  };

  if (showModal) {
      return (
          <div className="absolute inset-0 bg-dark z-50 p-6 flex flex-col justify-center animate-in fade-in duration-200">
              <div className="bg-surface border border-gray-700 rounded-xl p-6 shadow-2xl relative">
                  <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                      <X size={24} />
                  </button>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      {entryType === 'Work' && <CalendarClock className="text-emerald-400"/>}
                      {entryType === 'Annual' && <Briefcase className="text-blue-400"/>}
                      {entryType === 'Sick' && <Thermometer className="text-red-400"/>}
                      {entryType === 'Personal' && <Coffee className="text-yellow-400"/>}
                      {getModalTitle()}
                  </h3>

                  <div className="space-y-4">
                      {entryType === 'Work' && (
                          <div>
                              <label className="text-xs text-gray-400 block mb-1">日期</label>
                              <input 
                                type="date" 
                                value={entryDate} 
                                onChange={e => setEntryDate(e.target.value)} 
                                className="w-full bg-dark border border-gray-600 rounded p-2 text-white"
                              />
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs text-gray-400 block mb-1">{entryType === 'Work' ? '上班时间' : '开始时间'}</label>
                              <input type="time" value={entryStart} onChange={e => setEntryStart(e.target.value)} className="w-full bg-dark border border-gray-600 rounded p-2 text-white"/>
                          </div>
                          <div>
                              <label className="text-xs text-gray-400 block mb-1">{entryType === 'Work' ? '下班时间' : '结束时间'}</label>
                              <input type="time" value={entryEnd} onChange={e => setEntryEnd(e.target.value)} className="w-full bg-dark border border-gray-600 rounded p-2 text-white"/>
                          </div>
                      </div>
                      
                      {entryType !== 'Work' && (
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">工资折算比例 (1.0 = 全薪)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                min="0"
                                max="1"
                                value={leaveRatio} 
                                onChange={e => setLeaveRatio(parseFloat(e.target.value))} 
                                className="w-full bg-dark border border-gray-600 rounded p-2 text-white"
                            />
                        </div>
                      )}

                      <div className="bg-dark/50 p-3 rounded border border-gray-700/50 mt-4">
                          <p className="text-xs text-gray-500 mb-1">预计获得工资</p>
                          <p className="text-xl font-mono text-emerald-400 font-bold">
                              {formatCurrency(getPreviewAmount())}
                          </p>
                      </div>

                      <button onClick={submitEntry} className="w-full bg-primary text-dark font-bold py-3 rounded hover:bg-emerald-400 mt-4">
                          确认添加记录
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  if (!currentSession) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="mb-8 p-6 rounded-full bg-surface border-4 border-gray-700 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
            <Clock size={64} className="text-gray-500" />
            </div>
            <h2 className="text-3xl font-light text-gray-300 mb-2">准备开工?</h2>
            <p className="text-gray-500 mb-8 max-w-xs">开始追踪以实时查看你的收益。</p>
            <button
            onClick={onStart}
            className="group relative inline-flex items-center justify-center px-12 py-5 font-bold text-white transition-all duration-200 bg-primary text-xl rounded-full hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] focus:outline-none ring-offset-2 focus:ring-2 ring-emerald-400"
            >
            <Play className="mr-2 fill-current" /> 上班打卡
            </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="mt-auto border-t border-gray-800 pt-6">
            <p className="text-xs text-gray-500 uppercase font-bold mb-3 text-center">快捷记录</p>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => openModal('Work')} className="bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-emerald-500 hover:text-emerald-400 transition-colors">
                    <CalendarClock size={18} className="text-emerald-500 mb-1" />
                    <span className="text-[10px] font-bold text-gray-300">补卡</span>
                </button>
                <button onClick={() => openModal('Annual')} className="bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-blue-500 hover:text-blue-400 transition-colors">
                    <Briefcase size={18} className="text-blue-500 mb-1" />
                    <span className="text-[10px] font-bold text-gray-300">年假</span>
                </button>
                <button onClick={() => openModal('Sick')} className="bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-red-500 hover:text-red-400 transition-colors">
                    <Thermometer size={18} className="text-red-500 mb-1" />
                    <span className="text-[10px] font-bold text-gray-300">病假</span>
                </button>
                <button onClick={() => openModal('Personal')} className="bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-yellow-500 hover:text-yellow-400 transition-colors">
                    <Coffee size={18} className="text-yellow-500 mb-1" />
                    <span className="text-[10px] font-bold text-gray-300">事假</span>
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center h-full p-4 transition-colors duration-1000 ${metrics.isOvertime ? 'bg-red-950/20' : ''}`}>
      
      {/* Status Label */}
      <div className={`text-sm font-bold uppercase tracking-widest mb-6 py-1 px-3 rounded-full border ${metrics.isOvertime ? 'text-red-500 border-red-500 bg-red-500/10 animate-pulse' : 'text-emerald-500 border-emerald-500 bg-emerald-500/10'}`}>
        {metrics.isOvertime ? '加班中 (时薪递减)' : '工作中'}
      </div>

      {/* Main Money Display */}
      <div className="mb-2">
        <span className={`text-5xl md:text-6xl font-mono font-bold tracking-tighter ${metrics.isOvertime ? 'text-red-500' : 'text-white'}`}>
          {formatCurrency(metrics.moneyEarned)}
        </span>
      </div>
      
      {/* Label explaining the number above */}
      <p className="text-gray-400 text-sm mb-12">
        {metrics.isOvertime ? '本日工资已达上限 (加班无薪)' : '今日已赚'}
      </p>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-8 w-full max-w-md mb-12">
        <div className="text-center p-4 rounded-lg bg-surface border border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">平均时薪</p>
          <p className={`text-2xl font-mono font-bold ${metrics.isOvertime ? 'text-red-400 animate-pulse-slow' : 'text-primary'}`}>
            {formatCurrency(metrics.displayRate).replace('¥', '')}/时
          </p>
          {metrics.isOvertime && <span className="text-[10px] text-red-400">正在递减...</span>}
        </div>
        
        <div className="text-center p-4 rounded-lg bg-surface border border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">工作时长</p>
          <p className="text-2xl font-mono font-bold text-gray-200">
            {formatTime(metrics.workedMinutes * 60 * 1000)}
          </p>
        </div>
      </div>

      {/* Stop Button */}
      <button
        onClick={handleStop}
        className="w-full max-w-xs py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2"
      >
        <Square size={18} fill="currentColor" /> 下班打卡
      </button>

    </div>
  );
};
