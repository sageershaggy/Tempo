import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps, HealthSettings, HealthLog } from '../types';
import { getHealthSettings, saveHealthSettings, getHealthLog, addHealthLog } from '../services/storageService';

const HEALTH_TYPES = [
  { id: 'screen_break' as const, label: 'Screen Break', icon: 'visibility_off', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Look away from screen, rest your eyes' },
  { id: 'water' as const, label: 'Drink Water', icon: 'water_drop', color: 'text-cyan-400', bg: 'bg-cyan-500/10', desc: 'Stay hydrated for better focus' },
  { id: 'stretch' as const, label: 'Stretch', icon: 'self_improvement', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Stand up and stretch your body' },
  { id: 'eye_rest' as const, label: 'Eye Rest (20-20-20)', icon: 'remove_red_eye', color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Look 20ft away for 20 seconds every 20min' },
  { id: 'posture' as const, label: 'Posture Check', icon: 'accessibility_new', color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Sit up straight, shoulders back' },
];

export const HealthScreen: React.FC<GlobalProps> = ({ setScreen }) => {
  const [settings, setSettings] = useState<HealthSettings>({
    enabled: true,
    screenBreakEnabled: true,
    screenBreakInterval: 30,
    waterReminderEnabled: true,
    waterReminderInterval: 45,
    stretchReminderEnabled: false,
    stretchReminderInterval: 60,
    eyeRestEnabled: true,
    eyeRestInterval: 20,
    posturCheckEnabled: false,
    postureCheckInterval: 30,
  });
  const [healthLog, setHealthLog] = useState<HealthLog[]>([]);
  const [todayStats, setTodayStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const s = await getHealthSettings();
      setSettings(s);
      const log = await getHealthLog();
      setHealthLog(log);
    };
    load();
  }, []);

  // Calculate today's stats whenever log changes
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const todayLogs = healthLog.filter(l => l.date === today);
    const counts: Record<string, number> = {};
    todayLogs.forEach(l => {
      counts[l.type] = (counts[l.type] || 0) + 1;
    });
    setTodayStats(counts);
  }, [healthLog]);

  const handleToggle = async (key: keyof HealthSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveHealthSettings({ [key]: value });
  };

  const handleIntervalChange = async (key: keyof HealthSettings, value: number) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveHealthSettings({ [key]: value });
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

  // Get last 7 days data for the weekly chart
  const getWeeklyData = () => {
    const days: { date: string; label: string; counts: Record<string, number> }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayLogs = healthLog.filter(l => l.date === dateStr);
      const counts: Record<string, number> = {};
      dayLogs.forEach(l => {
        counts[l.type] = (counts[l.type] || 0) + 1;
      });
      days.push({ date: dateStr, label: dayLabel, counts });
    }
    return days;
  };

  const weeklyData = getWeeklyData();
  const totalToday = Object.values(todayStats).reduce((a: number, b: number) => a + b, 0);

  // Setting mapping for each health type
  const settingsMap: { type: HealthLog['type']; enabledKey: keyof HealthSettings; intervalKey: keyof HealthSettings }[] = [
    { type: 'screen_break', enabledKey: 'screenBreakEnabled', intervalKey: 'screenBreakInterval' },
    { type: 'water', enabledKey: 'waterReminderEnabled', intervalKey: 'waterReminderInterval' },
    { type: 'stretch', enabledKey: 'stretchReminderEnabled', intervalKey: 'stretchReminderInterval' },
    { type: 'eye_rest', enabledKey: 'eyeRestEnabled', intervalKey: 'eyeRestInterval' },
    { type: 'posture', enabledKey: 'posturCheckEnabled', intervalKey: 'postureCheckInterval' },
  ];

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-muted">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Health & Wellness</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-6">

        {/* Today's Summary Card */}
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

            {/* Quick Log Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {HEALTH_TYPES.map(ht => {
                const count = todayStats[ht.id] || 0;
                return (
                  <button
                    key={ht.id}
                    onClick={() => handleLogActivity(ht.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-black/20 border border-white/5 hover:border-green-500/30 hover:bg-green-500/5 transition-all active:scale-95 group"
                  >
                    <div className={`w-8 h-8 rounded-lg ${ht.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <span className={`material-symbols-outlined text-sm ${ht.color}`}>{ht.icon}</span>
                    </div>
                    <span className="text-[8px] font-bold text-muted leading-tight text-center">{ht.label.split(' ')[0]}</span>
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

        {/* Weekly Activity Chart */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Weekly Activity</h3>
          <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
            <div className="flex items-end justify-between gap-1 h-24 mb-2">
              {weeklyData.map((day) => {
                const total = Object.values(day.counts).reduce((a: number, b: number) => a + b, 0);
                const maxHeight = 80;
                const height = total > 0 ? Math.max(8, Math.min(maxHeight, total * 12)) : 4;
                const isToday = day.date === new Date().toLocaleDateString('en-CA');
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-muted tabular-nums">{total || ''}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? 'bg-green-500' : total > 0 ? 'bg-green-500/40' : 'bg-white/5'}`}
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

        {/* Master Toggle */}
        <section>
          <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleToggle('enabled', !settings.enabled)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400">favorite</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Health Reminders</p>
                  <p className="text-[10px] text-muted">Get notified to take healthy breaks</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${settings.enabled ? 'bg-green-500' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enabled ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Individual Reminder Settings */}
        {settings.enabled && (
          <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Reminder Settings</h3>
            <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
              {HEALTH_TYPES.map((ht) => {
                const mapping = settingsMap.find(s => s.type === ht.id)!;
                const isEnabled = settings[mapping.enabledKey] as boolean;
                const interval = settings[mapping.intervalKey] as number;
                return (
                  <div key={ht.id} className="p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleToggle(mapping.enabledKey, !isEnabled)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${ht.bg} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined text-[18px] ${ht.color}`}>{ht.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{ht.label}</p>
                          <p className="text-[10px] text-muted">{ht.desc}</p>
                        </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${isEnabled ? 'bg-primary' : 'bg-surface-light'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-5' : 'left-1'}`}></div>
                      </div>
                    </div>

                    {isEnabled && (
                      <div className="mt-3 ml-12 flex items-center gap-3">
                        <span className="text-[10px] text-muted shrink-0">Every</span>
                        <div className="flex items-center gap-1">
                          <button
                            className="w-7 h-7 rounded bg-surface-light flex items-center justify-center hover:bg-white/10 text-xs font-bold"
                            onClick={() => handleIntervalChange(mapping.intervalKey, Math.max(5, interval - 5))}
                          >-</button>
                          <span className="text-sm font-bold w-8 text-center tabular-nums">{interval}</span>
                          <button
                            className="w-7 h-7 rounded bg-surface-light flex items-center justify-center hover:bg-white/10 text-xs font-bold"
                            onClick={() => handleIntervalChange(mapping.intervalKey, Math.min(120, interval + 5))}
                          >+</button>
                        </div>
                        <span className="text-[10px] text-muted">min</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Today's Log Timeline */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Today's Log</h3>
          <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
            {(() => {
              const today = new Date().toLocaleDateString('en-CA');
              const todayLogs = healthLog
                .filter(l => l.date === today)
                .sort((a, b) => b.completedAt - a.completedAt);

              if (todayLogs.length === 0) {
                return (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-3xl text-muted/30 mb-2">eco</span>
                    <p className="text-xs text-muted">No health activities logged today</p>
                    <p className="text-[10px] text-muted/60 mt-1">Use the buttons above to log activities</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {todayLogs.map(log => {
                    const ht = HEALTH_TYPES.find(h => h.id === log.type);
                    if (!ht) return null;
                    const time = new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-black/20">
                        <div className={`w-7 h-7 rounded-lg ${ht.bg} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined text-sm ${ht.color}`}>{ht.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80">{ht.label}</p>
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
