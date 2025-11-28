
import React, { useState, useEffect } from 'react';
import { Settings, WorkSession, DailyStat, ViewState } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
import { SettingsForm } from './components/SettingsForm';
import { Tracker } from './components/Tracker';
import { StatsDashboard } from './components/StatsDashboard';
import { CalendarView } from './components/CalendarView';
import { getStandardWorkMinutes, calculateLiveMetrics } from './services/calculator';
import { LayoutDashboard, Clock, Settings as SettingsIcon, CalendarDays } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [history, setHistory] = useState<DailyStat[]>([]);
  const [view, setView] = useState<ViewState>('tracker');
  const [isLoaded, setIsLoaded] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedSession = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);

    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedSession) setCurrentSession(JSON.parse(savedSession));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (currentSession) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(currentSession));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  }, [currentSession, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history, isLoaded]);


  // --- Handlers ---

  const handleStartSession = () => {
    const newSession: WorkSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      startTime: Date.now(),
      endTime: null
    };
    setCurrentSession(newSession);
  };

  const handleStopSession = (finalEarned: number, finalRate: number) => {
    if (!currentSession) return;

    const endTime = Date.now();
    const standardMinutes = getStandardWorkMinutes(settings);
    // Recalculate basic metrics for history
    const metrics = calculateLiveMetrics(settings, currentSession.startTime, endTime);
    
    const overtimeMs = metrics.isOvertime ? (endTime - (currentSession.startTime + (standardMinutes * 60 * 1000))) : 0; // Rough approximation for storage

    const stat: DailyStat = {
      date: currentSession.date,
      totalDurationMs: endTime - currentSession.startTime,
      overtimeDurationMs: Math.max(0, overtimeMs), // Store rough overtime duration
      earnedAmount: finalEarned,
      effectiveHourlyRate: finalRate,
      type: 'work'
    };

    setHistory(prev => [stat, ...prev]);
    setCurrentSession(null);
  };

  const handleLeaveEntry = (earned: number, durationMs: number, note: string, rate: number) => {
    const stat: DailyStat = {
        date: new Date().toISOString(),
        totalDurationMs: durationMs,
        overtimeDurationMs: 0,
        earnedAmount: earned,
        effectiveHourlyRate: rate,
        type: 'leave',
        note: note
    };
    setHistory(prev => [stat, ...prev]);
  };

  const handleManualWorkEntry = (date: string, earned: number, durationMs: number, overtimeMs: number, rate: number) => {
    const stat: DailyStat = {
        date: new Date(date).toISOString(), // use selected date
        totalDurationMs: durationMs,
        overtimeDurationMs: overtimeMs,
        earnedAmount: earned,
        effectiveHourlyRate: rate,
        type: 'work',
        note: '补卡'
    };
    setHistory(prev => [stat, ...prev]);
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    setView('tracker');
  };

  // --- Render ---

  if (!isLoaded) return <div className="min-h-screen bg-dark text-white flex items-center justify-center">加载中...</div>;

  if (!settings.isConfigured) {
    return (
      <div className="min-h-screen bg-dark p-4">
        <h1 className="text-center text-3xl font-bold text-white mt-10">欢迎使用 WageAware</h1>
        <p className="text-center text-gray-400 mt-2">让我们先设置一下您的薪资信息。</p>
        <SettingsForm 
            initialSettings={settings} 
            onSave={handleSaveSettings} 
            onCancel={() => {}} 
            isFirstRun={true} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col max-w-xl mx-auto border-x border-gray-800 shadow-2xl relative">
        {/* Header */}
        <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-dark/80 backdrop-blur-md sticky top-0 z-10">
            <h1 className="font-bold text-lg text-white tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                打工<span className="text-primary">人</span>计算器
            </h1>
            {currentSession && (
                <span className="text-xs font-mono text-red-400 border border-red-900 bg-red-900/20 px-2 py-1 rounded">进行中</span>
            )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
            {view === 'tracker' && (
                <Tracker 
                    settings={settings}
                    currentSession={currentSession}
                    onStart={handleStartSession}
                    onStop={handleStopSession}
                    onLeave={handleLeaveEntry}
                    onManualWork={handleManualWorkEntry}
                />
            )}
            {view === 'stats' && <StatsDashboard history={history} />}
            {view === 'calendar' && <CalendarView history={history} settings={settings} />}
            {view === 'settings' && (
                <SettingsForm 
                    initialSettings={settings}
                    onSave={handleSaveSettings}
                    onCancel={() => setView('tracker')}
                    isFirstRun={false}
                />
            )}
        </main>

        {/* Bottom Navigation */}
        <nav className="border-t border-gray-800 bg-surface grid grid-cols-4 p-2 pb-6 md:pb-2">
            <button 
                onClick={() => setView('tracker')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${view === 'tracker' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Clock size={24} />
                <span className="text-[10px] font-bold mt-1 uppercase">打卡</span>
            </button>
            
            <button 
                onClick={() => setView('calendar')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${view === 'calendar' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <CalendarDays size={24} />
                <span className="text-[10px] font-bold mt-1 uppercase">日历</span>
            </button>

            <button 
                onClick={() => setView('stats')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${view === 'stats' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <LayoutDashboard size={24} />
                <span className="text-[10px] font-bold mt-1 uppercase">统计</span>
            </button>
            
            <button 
                onClick={() => setView('settings')}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <SettingsIcon size={24} />
                <span className="text-[10px] font-bold mt-1 uppercase">设置</span>
            </button>
        </nav>
    </div>
  );
};

export default App;
