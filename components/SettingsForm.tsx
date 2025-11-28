
import React, { useState } from 'react';
import { Settings, WorkScheduleType, Holiday } from '../types';
import { SCHEDULE_LABELS, CHINA_HOLIDAYS_PRESET } from '../constants';
import { Save, AlertCircle, Plus, Trash2, Calendar, Download } from 'lucide-react';

interface Props {
  initialSettings: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
  isFirstRun: boolean;
}

export const SettingsForm: React.FC<Props> = ({ initialSettings, onSave, onCancel, isFirstRun }) => {
  const [formData, setFormData] = useState<Settings>(initialSettings);
  const [error, setError] = useState<string>('');
  
  // Holiday form state
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  const handleChange = (field: keyof Settings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addHoliday = () => {
    if (!newHolidayDate || !newHolidayName) return;
    const newHoliday: Holiday = {
        id: crypto.randomUUID(),
        date: newHolidayDate,
        name: newHolidayName
    };
    setFormData(prev => ({
        ...prev,
        holidays: [...prev.holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date))
    }));
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const removeHoliday = (id: string) => {
    setFormData(prev => ({
        ...prev,
        holidays: prev.holidays.filter(h => h.id !== id)
    }));
  };

  const importChinaHolidays = () => {
    const existingDates = new Set(formData.holidays.map(h => h.date));
    const newHolidays: Holiday[] = [];
    
    CHINA_HOLIDAYS_PRESET.forEach(preset => {
        if (!existingDates.has(preset.date)) {
            newHolidays.push({
                id: crypto.randomUUID(),
                date: preset.date,
                name: preset.name
            });
        }
    });

    if (newHolidays.length === 0) {
        alert('没有发现新的节假日需要导入 (可能已存在)。');
        return;
    }

    setFormData(prev => ({
        ...prev,
        holidays: [...prev.holidays, ...newHolidays].sort((a, b) => a.date.localeCompare(b.date))
    }));
    alert(`成功导入 ${newHolidays.length} 个中国法定节假日。`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.monthlySalary <= 0) {
      setError('请输入有效的月薪');
      return;
    }
    onSave({ ...formData, isConfigured: true });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-surface rounded-xl shadow-xl border border-gray-700 mt-8 mb-20">
      <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
        设置
      </h2>
      
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded mb-4 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">月薪 (税后/税前)</label>
            <input
                type="number"
                value={formData.monthlySalary || ''}
                onChange={(e) => handleChange('monthlySalary', Number(e.target.value))}
                className="w-full bg-dark border border-gray-600 rounded p-2 text-white focus:border-primary focus:outline-none"
                placeholder="例如: 10000"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">工作制度</label>
            <div className="grid grid-cols-3 gap-2">
                {[
                { label: SCHEDULE_LABELS[WorkScheduleType.DoubleWeekend], val: WorkScheduleType.DoubleWeekend },
                { label: SCHEDULE_LABELS[WorkScheduleType.SingleWeekend], val: WorkScheduleType.SingleWeekend },
                { label: SCHEDULE_LABELS[WorkScheduleType.NoWeekend], val: WorkScheduleType.NoWeekend },
                ].map((opt) => (
                <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleChange('scheduleType', opt.val)}
                    className={`p-2 rounded text-xs font-medium transition-colors ${
                    formData.scheduleType === opt.val
                        ? 'bg-primary text-dark'
                        : 'bg-dark border border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                >
                    {opt.label}
                </button>
                ))}
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">上班时间</label>
                <input
                type="time"
                value={formData.workStartTime}
                onChange={(e) => handleChange('workStartTime', e.target.value)}
                className="w-full bg-dark border border-gray-600 rounded p-2 text-white focus:border-primary focus:outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">下班时间</label>
                <input
                type="time"
                value={formData.workEndTime}
                onChange={(e) => handleChange('workEndTime', e.target.value)}
                className="w-full bg-dark border border-gray-600 rounded p-2 text-white focus:border-primary focus:outline-none"
                />
            </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-2">
                <input
                type="checkbox"
                id="hasLunch"
                checked={formData.hasLunchBreak}
                onChange={(e) => handleChange('hasLunchBreak', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-dark"
                />
                <label htmlFor="hasLunch" className="text-sm font-medium text-gray-300">有午休</label>
            </div>

            {formData.hasLunchBreak && (
                <div className="grid grid-cols-2 gap-4 mt-2 pl-6">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">午休开始</label>
                    <input
                    type="time"
                    value={formData.lunchStartTime}
                    onChange={(e) => handleChange('lunchStartTime', e.target.value)}
                    className="w-full bg-dark border border-gray-600 rounded p-2 text-sm text-white focus:border-primary focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">午休结束</label>
                    <input
                    type="time"
                    value={formData.lunchEndTime}
                    onChange={(e) => handleChange('lunchEndTime', e.target.value)}
                    className="w-full bg-dark border border-gray-600 rounded p-2 text-sm text-white focus:border-primary focus:outline-none"
                    />
                </div>
                </div>
            )}
            </div>
        </div>
        
        {/* Holidays Section */}
        <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Calendar size={16} /> 节假日设置
                </h3>
                <button 
                    type="button" 
                    onClick={importChinaHolidays}
                    className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded border border-blue-800 hover:bg-blue-800 flex items-center gap-1"
                >
                    <Download size={12} /> 导入中国节假日
                </button>
            </div>
            
            <div className="flex gap-2 mb-3">
                <input 
                    type="date" 
                    className="bg-dark border border-gray-600 rounded p-2 text-xs text-white flex-1"
                    value={newHolidayDate}
                    onChange={e => setNewHolidayDate(e.target.value)}
                />
                <input 
                    type="text" 
                    placeholder="节日名称"
                    className="bg-dark border border-gray-600 rounded p-2 text-xs text-white w-24"
                    value={newHolidayName}
                    onChange={e => setNewHolidayName(e.target.value)}
                />
                <button 
                    type="button" 
                    onClick={addHoliday}
                    className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-500"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {formData.holidays.length === 0 && <p className="text-xs text-gray-500 italic">暂无节假日配置</p>}
                {formData.holidays.map(h => (
                    <div key={h.id} className="flex justify-between items-center bg-dark/50 p-2 rounded border border-gray-700/50">
                        <div className="text-xs">
                            <span className="text-emerald-400 font-mono mr-2">{h.date}</span>
                            <span className="text-gray-300">{h.name}</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => removeHoliday(h.id)}
                            className="text-gray-500 hover:text-red-400"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="pt-4 flex gap-3">
          {!isFirstRun && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded font-bold text-dark bg-primary hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2"
          >
            <Save size={18} /> 保存配置
          </button>
        </div>
      </form>
    </div>
  );
};
