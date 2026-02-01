import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { getSettings, saveSettings, UserSettings, exportUserData } from '../services/storageService';
import { configManager } from '../config';
import { STORAGE_KEYS, LIMITS } from '../config/constants';

export const SettingsScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState }) => {
  // Modals
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback' | 'help'>('feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Timer Settings
  const [pomodoroFocus, setPomodoroFocus] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartPomos, setAutoStartPomos] = useState(false);

  // Sound & System
  const [tickingEnabled, setTickingEnabled] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(60);
  const [timerSound, setTimerSound] = useState('Desk Clock');
  const [notifications, setNotifications] = useState(true);
  const [calendarSync, setCalendarSync] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTheme, setActiveTheme] = useState('default');
  const [templates, setTemplates] = useState(configManager.getConfig().timer.templates);
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [, forceUpdate] = useState(0);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSettings();
      setPomodoroFocus(settings.focusDuration);
      setShortBreak(settings.shortBreak);
      setLongBreak(settings.longBreak);
      setAutoStartBreaks(settings.autoStartBreaks);
      setAutoStartPomos(settings.autoStartPomos);
      setNotifications(settings.notifications);
      setDarkMode(settings.darkMode);
      setActiveTheme(settings.theme);
      setTickingEnabled(settings.tickingEnabled);
      setTickSpeed(settings.tickingSpeed);

      // Ensure templates are loaded from latest config
      const currentConfig = configManager.getConfig();
      if (currentConfig.timer.templates && currentConfig.timer.templates.length > 0) {
        setTemplates(currentConfig.timer.templates);
      }
    };
    loadSettings();
  }, []);

  // Save settings when changed
  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    await saveSettings({ [key]: value });
  };

  // Load configuration dynamically
  const config = configManager.getConfig();
  const THEMES = config.themes;
  const TIMER_SOUNDS = config.timer.sounds;
  const TIMER_TEMPLATES = config.timer.templates; // This will be replaced by 'templates' state
  const TICKING_RANGE = config.timer.tickingSpeedRange;

  const handleThemeSelect = (themeId: string) => {
    setActiveTheme(themeId);
    handleSettingChange('theme', themeId);
    // Apply theme CSS variables immediately
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--color-primary', theme.cssVar);
      document.documentElement.style.setProperty('--color-primary-light', theme.cssVar + 'CC');
    }
  };

  const toggleCalendarSync = () => {
    setCalendarSync(!calendarSync);
  };

  const handleExportData = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tempo-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const openFeedbackModal = (type: 'bug' | 'feedback' | 'help') => {
    setFeedbackType(type);
    setFeedbackText('');
    setFeedbackSent(false);
    setShowFeedbackModal(true);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;

    // Save to local storage for Admin screen
    const newReport = {
      id: Date.now().toString(),
      type: feedbackType,
      text: feedbackText,
      date: new Date().toISOString(),
      status: 'open',
      user: 'Current User' // Since we don't have real auth yet
    };

    const existingReports = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK_REPORTS) || '[]');
    localStorage.setItem(STORAGE_KEYS.FEEDBACK_REPORTS, JSON.stringify([newReport, ...existingReports]));

    console.log('Feedback submitted:', newReport);
    setFeedbackSent(true);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackSent(false);
    }, 2000);
  };

  const openChromeWebStore = () => {
    window.open(config.app.chromeWebStoreUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-muted">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Settings</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-8">

        {/* Quick Templates */}
        <section>
          <div className="flex justify-between items-end mb-3 ml-1">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Quick Templates</h3>
            <button
              onClick={() => setIsEditingTemplates(!isEditingTemplates)}
              className="text-[10px] font-bold text-primary hover:text-primary-light transition-colors"
            >
              {isEditingTemplates ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
            <div className="grid grid-cols-3 gap-3">
              {templates.map(template => (
                <div key={template.id} className="relative">
                  <button
                    onClick={() => {
                      if (isEditingTemplates) return;
                      setPomodoroFocus(template.focusMinutes);
                      setShortBreak(template.breakMinutes);
                      handleSettingChange('focusDuration', template.focusMinutes);
                      handleSettingChange('shortBreak', template.breakMinutes);
                    }}
                    disabled={isEditingTemplates}
                    className={`w-full p-3 rounded-xl border text-center transition-all ${!isEditingTemplates && pomodoroFocus === template.focusMinutes && shortBreak === template.breakMinutes
                      ? 'bg-primary/20 border-primary text-white'
                      : 'border-white/10 text-muted hover:border-white/30'
                      } ${isEditingTemplates ? 'opacity-60 cursor-default' : ''}`}
                  >
                    <p className="font-bold text-lg">{template.label}</p>
                    <p className="text-[10px] text-muted">{template.description}</p>
                  </button>
                  {isEditingTemplates && (
                    <button
                      onClick={() => {
                        const newTemplates = templates.filter(t => t.id !== template.id);
                        setTemplates(newTemplates);
                        configManager.saveConfig({
                          timer: { ...configManager.getConfig().timer, templates: newTemplates }
                        });
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timer Configuration */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Timer Configuration</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">

            {/* Durations */}
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-white">Focus Duration</label>
                <span className="text-primary font-bold">{pomodoroFocus}m</span>
              </div>
              <input
                type="range" min={LIMITS.MIN_FOCUS_DURATION} max={LIMITS.MAX_FOCUS_DURATION} step="5"
                value={pomodoroFocus}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPomodoroFocus(val);
                  handleSettingChange('focusDuration', val);
                }}
                className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
              />

              <div className="flex justify-between items-center pt-2">
                <label className="text-sm font-bold text-white">Short Break</label>
                <span className="text-secondary font-bold">{shortBreak}m</span>
              </div>
              <input
                type="range" min={LIMITS.MIN_BREAK_DURATION} max={LIMITS.MAX_BREAK_DURATION} step="1"
                value={shortBreak}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setShortBreak(val);
                  handleSettingChange('shortBreak', val);
                }}
                className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary cursor-pointer"
              />

              {/* Save as Preset */}
              <button
                onClick={() => {
                  const label = prompt('Enter name for this preset (e.g., "Power Hour"):');
                  if (!label) return;

                  const newTemplate = {
                    id: label.toLowerCase().replace(/\s+/g, '-'),
                    label,
                    description: `${pomodoroFocus}/${shortBreak}`,
                    focusMinutes: pomodoroFocus,
                    breakMinutes: shortBreak
                  };

                  const newTemplates = [...templates, newTemplate];
                  setTemplates(newTemplates);
                  configManager.saveConfig({
                    timer: { ...configManager.getConfig().timer, templates: newTemplates }
                  });
                }}
                className="w-full mt-2 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-center text-muted hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                Save as new preset
              </button>
            </div>

            {/* Long Break Config */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold">Long Break Duration</span>
                <span className="text-blue-400 font-bold">{longBreak}m</span>
              </div>
              <input
                type="range" min={LIMITS.MIN_LONG_BREAK} max={LIMITS.MAX_LONG_BREAK} step="5"
                value={longBreak}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLongBreak(val);
                  handleSettingChange('longBreak', val);
                }}
                className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 cursor-pointer"
              />

              <div className="flex justify-between items-center mt-4">
                <div>
                  <p className="text-sm font-bold">Long Break Interval</p>
                  <p className="text-[10px] text-muted">Sessions before long break</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="w-7 h-7 rounded bg-surface-light flex items-center justify-center hover:bg-white/10" onClick={() => setLongBreakInterval(Math.max(LIMITS.MIN_LONG_BREAK_INTERVAL, longBreakInterval - 1))}>-</button>
                  <span className="text-sm font-bold">{longBreakInterval}</span>
                  <button className="w-7 h-7 rounded bg-surface-light flex items-center justify-center hover:bg-white/10" onClick={() => setLongBreakInterval(Math.min(LIMITS.MAX_LONG_BREAK_INTERVAL, longBreakInterval + 1))}>+</button>
                </div>
              </div>
            </div>

            {/* Automation Toggles */}
            <div
              className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => {
                const newVal = !autoStartBreaks;
                setAutoStartBreaks(newVal);
                handleSettingChange('autoStartBreaks', newVal);
              }}
            >
              <div>
                <p className="text-sm font-bold">Auto-start Breaks</p>
                <p className="text-[10px] text-muted">No need to manually start break</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${autoStartBreaks ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoStartBreaks ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            <div
              className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => {
                const newVal = !autoStartPomos;
                setAutoStartPomos(newVal);
                handleSettingChange('autoStartPomos', newVal);
              }}
            >
              <div>
                <p className="text-sm font-bold">Auto-start Pomodoros</p>
                <p className="text-[10px] text-muted">Seamlessly start next session</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${autoStartPomos ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoStartPomos ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Sound & Notifications */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Sound & Feedback</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {/* App Volume */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-muted">volume_up</span>
                  <span className="text-sm font-bold">App Volume</span>
                </div>
                <span className="text-primary font-bold text-sm">{audioState.volume}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="5"
                value={audioState.volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAudioState(prev => ({ ...prev, volume: val }));
                }}
                className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
              />
              <p className="text-[10px] text-muted mt-2">Controls all app sounds including background audio and ticking</p>
            </div>

            {/* Timer End Sound */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold">Timer End Sound</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {TIMER_SOUNDS.map(sound => (
                  <button
                    key={sound}
                    onClick={() => setTimerSound(sound)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${timerSound === sound
                      ? 'bg-primary text-white'
                      : 'bg-surface-light text-muted hover:bg-white/10'
                      }`}
                  >
                    {sound}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticking Sound */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold">Ticking Sound</span>
                <span className="text-xs text-muted font-bold">{tickingEnabled ? `${tickSpeed} bpm` : 'Off'}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex rounded-lg border border-white/10 overflow-hidden shrink-0">
                  <button
                    onClick={() => {
                      setTickingEnabled(false);
                      handleSettingChange('tickingEnabled', false);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${!tickingEnabled ? 'bg-white text-black' : 'text-muted hover:text-white'}`}
                  >
                    Off
                  </button>
                  <button
                    onClick={() => {
                      setTickingEnabled(true);
                      handleSettingChange('tickingEnabled', true);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${tickingEnabled ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                  >
                    On
                  </button>
                </div>
                <input
                  type="range" min={TICKING_RANGE.min} max={TICKING_RANGE.max} step={TICKING_RANGE.step}
                  value={tickSpeed}
                  disabled={!tickingEnabled}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTickSpeed(val);
                    handleSettingChange('tickingSpeed', val);
                  }}
                  className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer ${!tickingEnabled ? 'bg-white/5' : 'bg-surface-light [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full'}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">
            Appearance
          </h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
            <p className="text-sm font-bold mb-3">App Theme</p>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map(theme => {
                const isActive = activeTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'border-white/30 bg-white/5 scale-105'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full ${theme.color} shadow-lg transition-all ${
                          isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-dark' : 'group-hover:scale-110'
                        }`}
                      ></div>
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-sm drop-shadow-lg">check</span>
                        </div>
                      )}
                      {theme.pro && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="material-symbols-outlined text-[8px] text-black">star</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-semibold leading-tight text-center ${
                      isActive ? 'text-white' : 'text-muted'
                    }`}>{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Categories Management */}
        <section>
          <div className="flex justify-between items-end mb-3 ml-1">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Categories</h3>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
            <p className="text-xs text-muted mb-3">Customize your project tags</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {config.categories.task.map(cat => (
                <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light rounded-lg border border-white/5 group">
                  <span className="text-xs font-bold">{cat}</span>
                  {cat !== config.categories.defaultTaskCategory && (
                    <button
                      onClick={() => {
                        const newCats = config.categories.task.filter(c => c !== cat);
                        configManager.saveConfig({
                          categories: { ...config.categories, task: newCats }
                        });
                        // Create a force update or better yet, genericize state management
                        // For now, reloading would be needed or lifting state, but 
                        // we will just re-render by updating local dummy state
                        forceUpdate(n => n + 1);
                      }}
                      className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  const name = prompt('Enter new category name:');
                  if (name && !config.categories.task.includes(name)) {
                    const newCats = [...config.categories.task, name];
                    configManager.saveConfig({
                      categories: { ...config.categories, task: newCats }
                    });
                    forceUpdate(n => n + 1);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-xs font-bold text-muted hover:text-white hover:border-white/40 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Data & System */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">System</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
              onClick={() => {
                const newVal = !notifications;
                setNotifications(newVal);
                handleSettingChange('notifications', newVal);
              }}
            >
              <div>
                <p className="text-sm font-bold">Notifications</p>
                <p className="text-[10px] text-muted">Alert when timer ends</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setScreen(Screen.INTEGRATIONS)}
            >
              <div>
                <p className="text-sm font-bold">Integrations & Sync</p>
                <p className="text-[10px] text-muted">Google Tasks, Microsoft To Do</p>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
            </div>

            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={toggleCalendarSync}>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-bold">Calendar Sync</p>
                  <p className="text-[10px] text-muted">
                    {calendarSync
                      ? (JSON.parse(localStorage.getItem('tempo_user_profile') || '{}').email
                        ? `Connected: ${JSON.parse(localStorage.getItem('tempo_user_profile') || '{}').email}`
                        : 'Connected')
                      : 'Sync Google Calendar'}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${calendarSync ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${calendarSync ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Dark Mode */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
              onClick={() => {
                const newVal = !darkMode;
                setDarkMode(newVal);
                handleSettingChange('darkMode', newVal);
              }}
            >
              <div>
                <p className="text-sm font-bold">Dark Mode</p>
                <p className="text-[10px] text-muted">System appearance preference</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Pro Data Export */}
            <div
              onClick={handleExportData}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">Export Data (JSON)</p>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">download</span>
            </div>
          </div>
        </section>

        {/* Help & Support — Quick Actions Grid */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Help & Support</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => openFeedbackModal('help')}
              className="bg-surface-dark rounded-xl border border-white/5 p-3 flex flex-col items-center gap-2 hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-blue-400">help</span>
              </div>
              <span className="text-[10px] font-semibold text-white/70">Help</span>
            </button>
            <button
              onClick={() => openFeedbackModal('bug')}
              className="bg-surface-dark rounded-xl border border-white/5 p-3 flex flex-col items-center gap-2 hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-red-400">bug_report</span>
              </div>
              <span className="text-[10px] font-semibold text-white/70">Bug</span>
            </button>
            <button
              onClick={() => openFeedbackModal('feedback')}
              className="bg-surface-dark rounded-xl border border-white/5 p-3 flex flex-col items-center gap-2 hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-primary">chat_bubble</span>
              </div>
              <span className="text-[10px] font-semibold text-white/70">Feedback</span>
            </button>
          </div>
          {/* Rate Us Banner */}
          <button
            onClick={openChromeWebStore}
            className="w-full mt-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 rounded-xl border border-yellow-500/10 p-3 flex items-center gap-3 hover:from-yellow-500/15 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-yellow-400">star</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-white/90">Enjoying Tempo?</p>
              <p className="text-[10px] text-muted">Rate us on Chrome Web Store</p>
            </div>
            <span className="material-symbols-outlined text-sm text-muted">open_in_new</span>
          </button>
        </section>

        {/* Footer: Legal + Account */}
        <section className="pt-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={() => setScreen(Screen.PRIVACY_POLICY)} className="text-[10px] font-semibold text-muted hover:text-white/70 transition-colors">
              Privacy Policy
            </button>
            <span className="text-[10px] text-white/10">·</span>
            <button onClick={() => setScreen(Screen.TERMS)} className="text-[10px] font-semibold text-muted hover:text-white/70 transition-colors">
              Terms of Service
            </button>
            <span className="text-[10px] text-white/10">·</span>
            <button onClick={() => setScreen(Screen.PROFILE)} className="text-[10px] font-semibold text-muted hover:text-white/70 transition-colors">
              Account
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <button onClick={() => setScreen(Screen.LOGIN)} className="text-[10px] font-semibold text-red-400/70 hover:text-red-400 transition-colors">
              Sign Out
            </button>
          </div>
          <p className="text-[9px] text-muted/30 text-center">{config.app.name} v{config.app.version} (Build {config.app.build})</p>
        </section>

      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-dark rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                {feedbackType === 'bug' ? 'Report a Bug' : feedbackType === 'help' ? 'Help & FAQ' : 'Send Feedback'}
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-muted">close</span>
              </button>
            </div>

            {feedbackType === 'help' ? (
              <div className="space-y-4">
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <h4 className="font-bold text-sm mb-2">How do I start a focus session?</h4>
                  <p className="text-xs text-muted">Tap the play button on the Timer screen to start your focus session. You can adjust the duration in Settings.</p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <h4 className="font-bold text-sm mb-2">Is my data synced across devices?</h4>
                  <p className="text-xs text-muted">Yes! If you're signed into Chrome, your data syncs automatically across all your devices.</p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <h4 className="font-bold text-sm mb-2">Need more help?</h4>
                  <p className="text-xs text-muted mb-2">Send us a message and we'll get back to you.</p>
                  <button
                    onClick={() => setFeedbackType('feedback')}
                    className="text-primary text-xs font-bold"
                  >
                    Contact Support →
                  </button>
                </div>
              </div>
            ) : !feedbackSent ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${feedbackType === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                    }`}>
                    <span className="material-symbols-outlined">
                      {feedbackType === 'bug' ? 'bug_report' : 'chat_bubble'}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {feedbackType === 'bug'
                      ? 'Describe the bug you encountered'
                      : 'We\'d love to hear your thoughts!'
                    }
                  </p>
                </div>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={feedbackType === 'bug'
                    ? 'What happened? What did you expect to happen?'
                    : 'Your feedback helps us improve Tempo...'
                  }
                  className="w-full h-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary focus:outline-none resize-none"
                  autoFocus
                />
                <button
                  onClick={handleSendFeedback}
                  disabled={!feedbackText.trim()}
                  className={`w-full py-3 font-bold rounded-xl transition-colors ${feedbackText.trim()
                    ? 'bg-primary text-white hover:bg-primary-light'
                    : 'bg-white/10 text-muted cursor-not-allowed'
                    }`}
                >
                  Send {feedbackType === 'bug' ? 'Report' : 'Feedback'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-green-500 mb-3">check_circle</span>
                <p className="font-bold text-white mb-1">Thank you!</p>
                <p className="text-sm text-muted">
                  {feedbackType === 'bug'
                    ? 'We\'ll look into this issue.'
                    : 'Your feedback has been received.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
