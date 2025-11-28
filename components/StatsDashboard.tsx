
import React, { useMemo, useState } from 'react';
import { DailyStat } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

interface Props {
  history: DailyStat[];
}

type Period = 'week' | 'month' | 'year';

export const StatsDashboard: React.FC<Props> = ({ history }) => {
  const [period, setPeriod] = useState<Period>('month');

  const stats = useMemo(() => {
    if (!history.length) return null;

    const now = new Date();
    let filtered = history;

    if (period === 'week') {
      const start = startOfWeek(now);
      filtered = history.filter(d => new Date(d.date) >= start);
    } else if (period === 'month') {
      const start = startOfMonth(now);
      filtered = history.filter(d => new Date(d.date) >= start);
    } else if (period === 'year') {
      const start = startOfYear(now);
      filtered = history.filter(d => new Date(d.date) >= start);
    }

    if (filtered.length === 0) return null;

    const totalDuration = filtered.reduce((acc, cur) => acc + cur.totalDurationMs, 0);
    const totalOvertime = filtered.reduce((acc, cur) => acc + cur.overtimeDurationMs, 0);
    const totalEarned = filtered.reduce((acc, cur) => acc + cur.earnedAmount, 0);
    const avgRate = filtered.reduce((acc, cur) => acc + cur.effectiveHourlyRate, 0) / filtered.length;
    
    // Max duration
    const maxDurationSession = filtered.reduce((prev, current) => (prev.totalDurationMs > current.totalDurationMs) ? prev : current);

    // Chart Data
    const chartData = filtered.map(d => ({
        date: format(new Date(d.date), period === 'year' ? 'MM月' : 'dd日'),
        rate: d.effectiveHourlyRate,
        overtime: d.overtimeDurationMs / 1000 / 60 / 60, // hours
        type: d.type
    }));

    return {
        avgHourlyRate: avgRate,
        avgOvertimeMinutes: (totalOvertime / filtered.length) / 1000 / 60,
        maxDurationHours: maxDurationSession.totalDurationMs / 1000 / 60 / 60,
        totalEarned,
        chartData
    };
  }, [history, period]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <TrendingUp size={48} className="mb-4 opacity-50" />
        <p>暂无工作记录。</p>
        <p className="text-sm">第一次打卡下班后即可查看统计。</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20 overflow-y-auto h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">统计报表</h2>
        <div className="flex bg-dark rounded-lg p-1 border border-gray-700">
            {[
                {k: 'week', l: '周'},
                {k: 'month', l: '月'},
                {k: 'year', l: '年'}
            ].map((p) => (
                <button
                    key={p.k}
                    onClick={() => setPeriod(p.k as Period)}
                    className={`px-3 py-1 rounded text-xs ${period === p.k ? 'bg-surface text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    {p.l}
                </button>
            ))}
        </div>
      </div>

      {!stats ? (
          <div className="text-center text-gray-500 py-10">此时间段无数据。</div>
      ) : (
        <>
            {/* Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <DollarSign size={16} />
                        <span className="text-xs uppercase font-bold">平均时薪</span>
                    </div>
                    <div className="text-2xl font-mono text-emerald-400 font-bold">
                        {formatCurrency(stats.avgHourlyRate)}/时
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <Clock size={16} />
                        <span className="text-xs uppercase font-bold">平均加班</span>
                    </div>
                    <div className="text-2xl font-mono text-red-400 font-bold">
                        {Math.round(stats.avgOvertimeMinutes)}分
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-gray-700 col-span-2">
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <TrendingDown size={16} />
                        <span className="text-xs uppercase font-bold">最长工时</span>
                    </div>
                    <div className="text-2xl font-mono text-white font-bold">
                        {stats.maxDurationHours.toFixed(2)} 小时
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="bg-surface p-4 rounded-xl border border-gray-700 h-64">
                <h3 className="text-sm font-bold text-gray-400 mb-4">有效时薪趋势</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#10b981' }}
                            cursor={{fill: 'transparent'}}
                            formatter={(val: number) => `¥${val.toFixed(2)}`}
                        />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                            {stats.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.type === 'leave' ? '#3b82f6' : (entry.rate < (stats.avgHourlyRate * 0.9) ? '#ef4444' : '#10b981')} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
      )}
    </div>
  );
};
