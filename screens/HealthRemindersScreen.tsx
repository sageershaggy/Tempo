import React, { useEffect, useState } from 'react';
import { Screen, GlobalProps, HealthSettings, HealthTypeConfig } from '../types';
import { getHealthSettings, saveHealthSettings } from '../services/storageService';
import { DEFAULT_HEALTH_TYPE_CONFIG, HEALTH_TYPES, INTERVAL_OPTIONS } from './healthConstants';

type ReminderPreset = {
  id: string;
  label: string;
  reminderCount: number;
  intervalMinutes: 15 | 30 | 45 | 60;
};

const REMINDER_PRESETS: ReminderPreset[] = [
  { id: 'balanced', label: 'Balanced', reminderCount: 3, intervalMinutes: 30 },
  { id: 'light', label: 'Light', reminderCount: 2, intervalMinutes: 45 },
  { id: 'focused', label: 'Focused', reminderCount: 4, intervalMinutes: 15 },
];

export const HealthRemindersScreen: React.FC<GlobalProps> = ({ setScreen }) => {
  const [settings, setSettings] = useState<HealthSettings>({ enabled: true, types: {} });
  const [expandedType, setExpandedType] = useState<string | null>(HEALTH_TYPES[0].id);

  useEffect(() => {
    const load = async () => {
      const saved = await getHealthSettings();
      setSettings(saved);
    };
    load();
  }, []);

  const getTypeConfig = (typeId: string): HealthTypeConfig => {
    return settings.types[typeId] || DEFAULT_HEALTH_TYPE_CONFIG;
  };

  const handleMasterToggle = async (value: boolean) => {
    const updated = { ...settings, enabled: value };
    setSettings(updated);
    await saveHealthSettings({ enabled: value });
  };

  const handleTypeToggle = async (typeId: string, value: boolean) => {
    const updatedTypes = {
      ...settings.types,
      [typeId]: {
        ...getTypeConfig(typeId),
        enabled: value,
      },
    };
    setSettings(prev => ({ ...prev, types: updatedTypes }));
    await saveHealthSettings({ types: updatedTypes });
  };

  const handleTypeConfig = async (typeId: string, key: keyof HealthTypeConfig, value: number | boolean) => {
    const updatedTypes = {
      ...settings.types,
      [typeId]: {
        ...getTypeConfig(typeId),
        [key]: value,
      },
    };
    setSettings(prev => ({ ...prev, types: updatedTypes }));
    await saveHealthSettings({ types: updatedTypes });
  };

  const applyPreset = async (preset: ReminderPreset) => {
    const updatedTypes = HEALTH_TYPES.reduce<Record<string, HealthTypeConfig>>((acc, type) => {
      acc[type.id] = {
        enabled: true,
        reminderCount: preset.reminderCount,
        intervalMinutes: preset.intervalMinutes,
      };
      return acc;
    }, {});

    const updated: HealthSettings = {
      enabled: true,
      types: updatedTypes,
    };

    setSettings(updated);
    await saveHealthSettings(updated);
  };

  const enabledTypesCount = HEALTH_TYPES.filter(type => getTypeConfig(type.id).enabled).length;

  return (
    <div className="h-full flex flex-col bg-background-dark pb-8 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.HEALTH)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-muted">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Reminder Settings</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-5">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-blue-300 text-sm mt-0.5">tips_and_updates</span>
          <p className="text-[11px] text-blue-100/80 leading-relaxed">
            Configure once and reminders will run in the background while you focus.
          </p>
        </div>

        <section className="bg-surface-dark rounded-xl border border-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Health Reminders</p>
              <p className="text-[10px] text-muted">
                {settings.enabled
                  ? `${enabledTypesCount}/${HEALTH_TYPES.length} reminder types enabled`
                  : 'All reminders paused'}
              </p>
            </div>
            <div
              className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${settings.enabled ? 'bg-green-500' : 'bg-surface-light'}`}
              onClick={() => handleMasterToggle(!settings.enabled)}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enabled ? 'left-5' : 'left-1'}`}></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {REMINDER_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="py-2 rounded-lg text-[10px] font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="block text-white">{preset.label}</span>
                <span className="block text-muted text-[9px] mt-0.5">{preset.reminderCount} x {preset.intervalMinutes}m</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
          {HEALTH_TYPES.map(type => {
            const typeConfig = getTypeConfig(type.id);
            const isExpanded = expandedType === type.id;
            return (
              <div key={type.id}>
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${type.bg} flex items-center justify-center`}>
                      <span className={`material-symbols-outlined text-sm ${type.color}`}>{type.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{type.label}</p>
                      <p className="text-[10px] text-muted">
                        {typeConfig.enabled
                          ? `${typeConfig.reminderCount} reminders, every ${typeConfig.intervalMinutes}m`
                          : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${typeConfig.enabled ? 'bg-green-500' : 'bg-surface-light'}`}
                      onClick={() => handleTypeToggle(type.id, !typeConfig.enabled)}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${typeConfig.enabled ? 'left-5' : 'left-1'}`}></div>
                    </div>
                    <button
                      onClick={() => setExpandedType(isExpanded ? null : type.id)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {isExpanded ? 'Done' : 'Edit'}
                    </button>
                  </div>
                </div>

                {isExpanded && typeConfig.enabled && (
                  <div className="px-4 pb-4 pt-1 bg-black/10 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted">Reminders per session</p>
                        <span className="text-xs font-bold text-primary">{typeConfig.reminderCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTypeConfig(type.id, 'reminderCount', Math.max(1, typeConfig.reminderCount - 1))}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-sm font-bold"
                        >
                          -
                        </button>
                        <div className="flex-1 h-1.5 bg-surface-light rounded-full relative overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(typeConfig.reminderCount / 10) * 100}%` }}
                          />
                        </div>
                        <button
                          onClick={() => handleTypeConfig(type.id, 'reminderCount', Math.min(10, typeConfig.reminderCount + 1))}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Interval</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {INTERVAL_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleTypeConfig(type.id, 'intervalMinutes', opt.value)}
                            className={`py-2 rounded-lg text-[11px] font-bold transition-all border ${
                              typeConfig.intervalMinutes === opt.value
                                ? 'bg-primary/20 border-primary text-white'
                                : 'bg-white/5 border-white/10 text-muted hover:border-white/20'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
};

