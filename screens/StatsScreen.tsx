import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { getStats, UserStats, exportUserDataAsCSV } from '../services/storageService';
import { configManager } from '../config';

export const StatsScreen: React.FC<GlobalProps> = ({ setScreen, tasks }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const data = await getStats();
      setStats(data);
    };
    loadStats();

    // Refresh stats periodically to catch updates from timer sessions
    const refreshInterval = setInterval(() => {
      getStats().then(data => setStats(data));
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Get current week's date range
  const getWeekRange = () => {
    const now = new Date();
    now.setDate(now.getDate() - weekOffset * 7);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  // Get days of current week with data
  const getWeekData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    now.setDate(now.getDate() - weekOffset * 7);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    return days.map((day, idx) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + idx);
      // Fix: Use local date string to match storageService format
      const dateStr = date.toLocaleDateString('en-CA');
      const minutes = stats?.weeklyData?.[dateStr] || 0;
      const isToday = dateStr === new Date().toLocaleDateString('en-CA');

      return {
        day: day[0],
        minutes,
        isToday,
        dateStr
      };
    });
  };

  const weekData = getWeekData();
  const maxMinutes = Math.max(...weekData.map(d => d.minutes), 1);
  const totalWeekMinutes = weekData.reduce((sum, d) => sum + d.minutes, 0);
  const totalHours = Math.floor(totalWeekMinutes / 60);
  const totalMins = totalWeekMinutes % 60;

  // Find best day
  const bestDay = weekData.reduce((best, curr) =>
    curr.minutes > best.minutes ? curr : best, weekData[0]);
  const bestDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekData.indexOf(bestDay)];

  // Average per day
  const avgMinutes = Math.floor(totalWeekMinutes / 7);
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMins = avgMinutes % 60;

  // Get task categories for top projects
  const taskCategories = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = { count: 0, completed: 0 };
    }
    acc[task.category].count++;
    if (task.completed) acc[task.category].completed++;
    return acc;
  }, {} as Record<string, { count: number; completed: number }>);

  const topCategories = Object.entries(taskCategories)
    .map(([name, data]: [string, { count: number; completed: number }]) => ({ name, count: data.count, completed: data.completed }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Get category icon from config
  const getCategoryIcon = (name: string) => {
    return configManager.getCategoryIcon(name);
  };

  const getCategoryColor = (idx: number) => {
    const colors = [
      { bg: 'bg-indigo-500/20', text: 'text-indigo-400', bar: 'bg-indigo-500' },
      { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
      { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500' },
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button onClick={() => setScreen(Screen.TIMER)} className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-bold">Weekly Report</h2>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 -mr-2 rounded-full hover:bg-white/5">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface-dark border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={async () => {
                    setShowMenu(false);
                    try {
                      const data = await exportUserDataAsCSV();
                      // Add BOM for Excel to recognize UTF-8
                      const blob = new Blob(['\uFEFF' + data], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `tempo-report-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error('Export failed:', e);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-muted">download</span>
                  Export Report (Excel)
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setWeekOffset(0);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-muted">today</span>
                  Go to This Week
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setScreen(Screen.SETTINGS);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  <span className="material-symbols-outlined text-base text-muted">settings</span>
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center py-4 gap-2">
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 rounded-full hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        <button className="flex items-center gap-2 bg-primary/20 text-primary-light px-4 py-2 rounded-full text-sm font-bold border border-primary/30">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          {getWeekRange()}
        </button>
        <button
          onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
          className={`p-2 rounded-full hover:bg-white/10 ${weekOffset === 0 ? 'opacity-30' : ''}`}
          disabled={weekOffset === 0}
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>

      <div className="px-6 py-2">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Weekly Focus</h3>
            <p className="text-4xl font-black mt-1">
              {totalHours}<span className="text-2xl text-muted font-medium">h</span> {totalMins}<span className="text-2xl text-muted font-medium">m</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Sessions</p>
            <p className="text-lg font-bold text-primary">{stats?.totalSessions || 0}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 flex items-end justify-between gap-2 mb-8">
          {weekData.map((bar, i) => {
            const height = maxMinutes > 0 ? Math.max(5, (bar.minutes / maxMinutes) * 100) : 5;
            const hours = Math.floor(bar.minutes / 60);
            const mins = bar.minutes % 60;
            const timeStr = bar.minutes > 0 ? `${hours}h ${mins}m` : '0m';

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                <div className="opacity-0 group-hover:opacity-100 text-[10px] text-muted font-bold transition-opacity">
                  {timeStr}
                </div>
                <div className="w-full relative rounded-t-lg overflow-hidden bg-surface-light group-hover:bg-surface-light/80 transition-all flex-1">
                  <div
                    className={`absolute bottom-0 w-full rounded-t-lg transition-all ${bar.isToday
                      ? 'bg-gradient-to-t from-primary to-secondary shadow-[0_0_15px_rgba(127,19,236,0.5)]'
                      : bar.minutes > 0
                        ? 'bg-primary/60 group-hover:bg-primary'
                        : 'bg-surface-light'
                      }`}
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
                <span className={`text-xs font-bold ${bar.isToday ? 'text-primary' : 'text-muted'}`}>{bar.day}</span>
              </div>
            );
          })}
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary bg-secondary/10 p-1.5 rounded-full text-sm">local_fire_department</span>
              <span className="text-xs font-bold uppercase text-muted">Best Day</span>
            </div>
            <p className="text-lg font-bold">{bestDay.minutes > 0 ? bestDayName : 'N/A'}</p>
            <p className="text-xs text-secondary font-bold mt-1">
              {bestDay.minutes > 0 ? `${Math.floor(bestDay.minutes / 60)}h ${bestDay.minutes % 60}m` : 'No data yet'}
            </p>
          </div>
          <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-full text-sm">avg_time</span>
              <span className="text-xs font-bold uppercase text-muted">Avg/Day</span>
            </div>
            <p className="text-lg font-bold">{avgHours}h {avgMins}m</p>
            <p className="text-xs text-primary font-bold mt-1">
              {stats?.currentStreak || 0} day streak
            </p>
          </div>
        </div>

        {/* Lifetime Stats */}
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-4 rounded-xl border border-primary/20 mb-8">
          <h4 className="text-xs font-bold uppercase text-muted mb-3">Lifetime Stats</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{stats?.totalSessions || 0}</p>
              <p className="text-[10px] text-muted">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{Math.floor((stats?.totalFocusMinutes || 0) / 60)}</p>
              <p className="text-[10px] text-muted">Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{stats?.currentStreak || 0}</p>
              <p className="text-[10px] text-muted">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Top Projects */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Task Categories</h3>
            <button onClick={() => setScreen(Screen.TASKS)} className="text-primary text-sm font-bold flex items-center">
              See All <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {topCategories.length > 0 ? (
              topCategories.map((cat, idx) => {
                const colors = getCategoryColor(idx);
                const progress = cat.count > 0 ? (cat.completed / cat.count) * 100 : 0;

                return (
                  <div key={cat.name} className="bg-surface-dark p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center`}>
                        <span className="material-symbols-outlined">{getCategoryIcon(cat.name)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.bar}`}></div>
                          <p className="text-xs text-muted">{cat.count} tasks</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{cat.completed}/{cat.count}</p>
                      <div className="w-16 h-1.5 bg-surface-light rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">analytics</span>
                <p className="text-sm">No tasks yet</p>
                <button onClick={() => setScreen(Screen.QUICK_ADD)} className="mt-3 text-primary text-xs font-bold">
                  + Add your first task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
