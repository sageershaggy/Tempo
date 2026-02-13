import React, { useEffect, useState } from 'react';
import { Screen, GlobalProps, HealthSettings, HealthLog } from '../types';
import { getHealthSettings, saveHealthSettings, getHealthLog, addHealthLog } from '../services/storageService';
import { DEFAULT_HEALTH_TYPE_CONFIG, HEALTH_TYPES } from './healthConstants';

export const HealthScreen: React.FC<GlobalProps> = ({ setScreen }) => {
  const [settings, setSettings] = useState<HealthSettings>({ enabled: true, types: {} });
  const [healthLog, setHealthLog] = useState<HealthLog[]>([]);
  const [todayStats, setTodayStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const savedSettings = await getHealthSettings();
      setSettings(savedSettings);

      const savedLog = await getHealthLog();
      setHealthLog(savedLog);
    };
    load();
  }, []);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const todayLogs = healthLog.filter(entry => entry.date === today);
    const counts: Record<string, number> = {};

    todayLogs.forEach(entry => {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    });

    setTodayStats(counts);
  }, [healthLog]);

  const handleMasterToggle = async (value: boolean) => {
    const updated = { ...settings, enabled: value };
    setSettings(updated);
    await saveHealthSettings({ enabled: value });
  };

  const handleLogActivity = async (type: HealthLog['type']) => {
    const entry: HealthLog = {
      id: `health-${Date.now()}`,
      type,
      completedAt: Date.now(),
      date: new Date().toLocaleDateString('en-CA'),
    };
    await addHealthLog(entry);
    setHealthLog(prev => [...prev, entry]);
  };

  const getWeeklyData = () => {
    const days: { date: string; label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dateStr = day.toLocaleDateString('en-CA');
      const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short' });
      const total = healthLog.filter(entry => entry.date === dateStr).length;
      days.push({ date: dateStr, label: dayLabel, total });
    }
    return days;
  };

  const enabledTypeConfigs = HEALTH_TYPES
    .map(type => settings.types[type.id] || DEFAULT_HEALTH_TYPE_CONFIG)
    .filter(cfg => cfg.enabled);
  const enabledTypesCount = enabledTypeConfigs.length;
  const averageInterval = enabledTypeConfigs.length > 0
    ? Math.round(enabledTypeConfigs.reduce((sum, cfg) => sum + cfg.intervalMinutes, 0) / enabledTypeConfigs.length)
    : 0;

  const weeklyData = getWeeklyData();
  const totalToday = Object.values(todayStats).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-muted">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Health & Wellness</h2>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Pro</span>
        </div>
        <button
          onClick={() => setScreen(Screen.HEALTH_REMINDERS)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
          title="Open reminder settings"
        >
          <span className="material-symbols-outlined text-muted text-[18px]">tune</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 rounded-xl border border-yellow-500/10 px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-yellow-400">celebration</span>
          <p className="text-[11px] font-semibold text-yellow-300/80">Free during launch period</p>
        </div>

        <section>
          <div className="bg-surface-dark rounded-xl border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Reminder Settings</p>
                <p className="text-[10px] text-muted">
                  {settings.enabled
                    ? `${enabledTypesCount}/${HEALTH_TYPES.length} types enabled - avg ${averageInterval}m interval`
                    : 'All health reminders are paused'}
                </p>
              </div>
              <button
                onClick={() => setScreen(Screen.HEALTH_REMINDERS)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary/15 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
              >
                Open Settings
              </button>
            </div>
            <div className="bg-black/20 rounded-lg border border-white/5 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400 text-sm">health_and_safety</span>
                <span className="text-[11px] font-semibold">Master Reminders</span>
              </div>
              <div
                className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${settings.enabled ? 'bg-green-500' : 'bg-surface-light'}`}
                onClick={() => handleMasterToggle(!settings.enabled)}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enabled ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-2xl border border-green-500/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Today's Health Score</h3>
                <p className="text-[10px] text-muted mt-0.5">Track your wellness habits</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                <span className="text-lg font-black text-green-400">{totalToday}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {HEALTH_TYPES.map(type => {
                const count = todayStats[type.id] || 0;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleLogActivity(type.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-black/20 border border-white/5 hover:border-green-500/30 hover:bg-green-500/5 transition-all active:scale-95 group"
                  >
                    <div className={`w-8 h-8 rounded-lg ${type.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <span className={`material-symbols-outlined text-sm ${type.color}`}>{type.icon}</span>
                    </div>
                    <span className="text-[8px] font-bold text-muted leading-tight text-center">{type.label.split(' ')[0]}</span>
                    {count > 0 && (
                      <span className="text-[9px] font-bold text-green-400">{count}x</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted text-center mt-3">Tap to log a completed activity</p>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Weekly Activity</h3>
          <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
            <div className="flex items-end justify-between gap-1 h-24 mb-2">
              {weeklyData.map(day => {
                const maxHeight = 80;
                const height = day.total > 0 ? Math.max(8, Math.min(maxHeight, day.total * 12)) : 4;
                const isToday = day.date === new Date().toLocaleDateString('en-CA');
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-muted tabular-nums">{day.total || ''}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? 'bg-green-500' : day.total > 0 ? 'bg-green-500/40' : 'bg-white/5'}`}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              {weeklyData.map(day => (
                <span key={day.date} className="flex-1 text-center text-[9px] font-semibold text-muted">{day.label}</span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Today's Log</h3>
          <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
            {(() => {
              const today = new Date().toLocaleDateString('en-CA');
              const todayLogs = healthLog
                .filter(entry => entry.date === today)
                .sort((a, b) => b.completedAt - a.completedAt);

              if (todayLogs.length === 0) {
                return (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-3xl text-muted/30 mb-2">eco</span>
                    <p className="text-xs text-muted">No health activities logged today</p>
                    <p className="text-[10px] text-muted/60 mt-1">Use the quick actions above to log activity</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {todayLogs.map(log => {
                    const type = HEALTH_TYPES.find(item => item.id === log.type);
                    if (!type) return null;
                    const time = new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-black/20">
                        <div className={`w-7 h-7 rounded-lg ${type.bg} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined text-sm ${type.color}`}>{type.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80">{type.label}</p>
                        </div>
                        <span className="text-[10px] text-muted font-mono">{time}</span>
                        <span className="material-symbols-outlined text-sm text-green-400">check_circle</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    </div>
  );
};
