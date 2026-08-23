import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { getSettings, saveSettings, UserSettings, exportUserDataAsCSV, getGeminiApiKey, setGeminiApiKey } from '../services/storageService';
import { verifyApiKey, resetAiClient } from '../services/geminiService';
import { authService } from '../services/authService';
import { configManager } from '../config';
import { STORAGE_KEYS } from '../config/constants';

export const SettingsScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState }) => {
  // Modals
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback' | 'help'>('feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Settings state
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartPomos, setAutoStartPomos] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTheme, setActiveTheme] = useState('default');

  // Timer configuration state
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);

  // AI assistant (bring-your-own Gemini key)
  const [aiKey, setAiKey] = useState('');
  const [aiKeySaved, setAiKeySaved] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiKey, setShowAiKey] = useState(false);

  useEffect(() => {
    getGeminiApiKey().then(key => {
      setAiKey(key);
      setAiKeySaved(Boolean(key));
    });
  }, []);

  const handleSaveAiKey = async () => {
    setAiStatus('testing');
    setAiError(null);

    const trimmed = aiKey.trim();
    if (!trimmed) {
      await setGeminiApiKey('');
      resetAiClient();
      setAiKeySaved(false);
      setAiStatus('idle');
      return;
    }

    const result = await verifyApiKey(trimmed);
    // `=== false` rather than `!result.ok`: without strictNullChecks the latter
    // does not narrow the union, so `result.error` would not be visible.
    if (result.ok === false) {
      setAiStatus('error');
      setAiError(result.error);
      return;
    }

    await setGeminiApiKey(trimmed);
    resetAiClient();
    setAiKeySaved(true);
    setAiStatus('ok');
  };

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSettings();
      setAutoStartBreaks(settings.autoStartBreaks);
      setAutoStartPomos(settings.autoStartPomos);
      setNotifications(settings.notifications);
      setDarkMode(settings.darkMode);
      setActiveTheme(settings.theme);
      setFocusDuration(settings.focusDuration);
      setShortBreak(settings.shortBreak);
      setLongBreak(settings.longBreak);
      setLongBreakInterval(settings.longBreakInterval);
    };
    loadSettings();
  }, []);

  // Save settings when changed
  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    await saveSettings({ [key]: value });
    if (key === 'darkMode') {
      document.documentElement.classList.toggle('dark', value);
    }
  };

  // Load configuration dynamically
  const config = configManager.getConfig();
  const THEMES = config.themes;

  const handleThemeSelect = (themeId: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    setActiveTheme(themeId);
    handleSettingChange('theme', themeId);
    if (theme) {
      document.documentElement.style.setProperty('--color-primary', theme.cssVar);
      document.documentElement.style.setProperty('--color-primary-light', theme.cssVar + 'CC');
      document.documentElement.style.setProperty('--color-secondary', theme.cssVar);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportUserDataAsCSV();
      const blob = new Blob(['\uFEFF' + data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tempo-data-${new Date().toISOString().split('T')[0]}.csv`;
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

    const newReport = {
      id: Date.now().toString(),
      type: feedbackType,
      text: feedbackText,
      date: new Date().toISOString(),
      status: 'open',
      user: 'Current User'
    };

    const existingReports = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK_REPORTS) || '[]');
    localStorage.setItem(STORAGE_KEYS.FEEDBACK_REPORTS, JSON.stringify([newReport, ...existingReports]));

    setFeedbackSent(true);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackSent(false);
    }, 2000);
  };

  const openChromeWebStore = () => {
    window.open(config.app.chromeWebStoreUrl, '_blank', 'noopener,noreferrer');
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

      <div className="p-6 space-y-6">

        {/* Timer Configuration */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Timer</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {/* Focus Duration */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">target</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Focus Duration</p>
                  <p className="text-[10px] text-muted">Minutes per focus session</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const v = Math.max(5, focusDuration - 5);
                    setFocusDuration(v);
                    handleSettingChange('focusDuration', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-sm font-bold w-8 text-center tabular-nums">{focusDuration}</span>
                <button
                  onClick={() => {
                    const v = Math.min(120, focusDuration + 5);
                    setFocusDuration(v);
                    handleSettingChange('focusDuration', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>

            {/* Short Break */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400">coffee</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Short Break</p>
                  <p className="text-[10px] text-muted">Minutes per short break</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const v = Math.max(1, shortBreak - 1);
                    setShortBreak(v);
                    handleSettingChange('shortBreak', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-sm font-bold w-8 text-center tabular-nums">{shortBreak}</span>
                <button
                  onClick={() => {
                    const v = Math.min(30, shortBreak + 1);
                    setShortBreak(v);
                    handleSettingChange('shortBreak', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>

            {/* Long Break */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400">hotel</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Long Break</p>
                  <p className="text-[10px] text-muted">Minutes per long break</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const v = Math.max(5, longBreak - 5);
                    setLongBreak(v);
                    handleSettingChange('longBreak', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-sm font-bold w-8 text-center tabular-nums">{longBreak}</span>
                <button
                  onClick={() => {
                    const v = Math.min(60, longBreak + 5);
                    setLongBreak(v);
                    handleSettingChange('longBreak', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>

            {/* Long Break Interval */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-400">repeat</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Long Break After</p>
                  <p className="text-[10px] text-muted">Sessions before a long break</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const v = Math.max(2, longBreakInterval - 1);
                    setLongBreakInterval(v);
                    handleSettingChange('longBreakInterval', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-sm font-bold w-8 text-center tabular-nums">{longBreakInterval}</span>
                <button
                  onClick={() => {
                    const v = Math.min(10, longBreakInterval + 1);
                    setLongBreakInterval(v);
                    handleSettingChange('longBreakInterval', v);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Toggles */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Features</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">

            {/* Notifications */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => {
                const newVal = !notifications;
                setNotifications(newVal);
                handleSettingChange('notifications', newVal);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400">notifications</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Notifications</p>
                  <p className="text-[10px] text-muted">Alert when timer ends</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Auto-start Breaks */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => {
                const newVal = !autoStartBreaks;
                setAutoStartBreaks(newVal);
                handleSettingChange('autoStartBreaks', newVal);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">play_circle</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Auto-start Breaks</p>
                  <p className="text-[10px] text-muted">Automatically start break after focus</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${autoStartBreaks ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoStartBreaks ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Auto-start Pomodoros */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => {
                const newVal = !autoStartPomos;
                setAutoStartPomos(newVal);
                handleSettingChange('autoStartPomos', newVal);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400">replay</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Auto-start Pomodoros</p>
                  <p className="text-[10px] text-muted">Seamlessly start next session</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${autoStartPomos ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoStartPomos ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Dark Mode */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => {
                const newVal = !darkMode;
                setDarkMode(newVal);
                handleSettingChange('darkMode', newVal);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-400">dark_mode</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Dark Mode</p>
                  <p className="text-[10px] text-muted">System appearance preference</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Configuration</h3>
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">

            {/* Health & Wellness */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setScreen(Screen.HEALTH_REMINDERS)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400">favorite</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Health Reminder Settings</p>
                  <p className="text-[10px] text-muted">Configure intervals, counts, and wellness reminders</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
            </div>

            {/* Integrations */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setScreen(Screen.INTEGRATIONS)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-400">sync</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Integrations & Sync</p>
                  <p className="text-[10px] text-muted">Google Tasks, Microsoft To Do</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
            </div>

            {/* App Theme */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setShowThemeModal(true)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-pink-400">palette</span>
                </div>
                <div>
                  <p className="text-sm font-bold">App Theme</p>
                  <p className="text-[10px] text-muted">Choose from {THEMES.length} themes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full ${THEMES.find(t => t.id === activeTheme)?.color || 'bg-primary'} shadow-sm`}></div>
                <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
              </div>
            </div>

            {/* Export Data */}
            <div
              onClick={handleExportData}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-teal-400">download</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Export Data</p>
                  <p className="text-[10px] text-muted">Download as CSV/Excel</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">download</span>
            </div>
          </div>
        </section>

        {/* AI Assistant — bring your own key */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">AI Assistant</h3>
          <div className="bg-surface-dark rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Magic Enhance</p>
                <p className="text-[10px] text-muted leading-relaxed">
                  Turns rough notes into clear task titles. Uses your own Google Gemini
                  key, stored only on this device — Tempo never sees it.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showAiKey ? 'text' : 'password'}
                  value={aiKey}
                  onChange={e => { setAiKey(e.target.value); setAiStatus('idle'); setAiError(null); }}
                  placeholder="Paste your Gemini API key"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full bg-background-dark border border-white/10 rounded-lg pl-3 pr-9 py-2.5 text-xs text-white placeholder-white/25 focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAiKey(v => !v)}
                  aria-label={showAiKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-base">
                    {showAiKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <button
                onClick={handleSaveAiKey}
                disabled={aiStatus === 'testing'}
                className="px-4 rounded-lg bg-primary hover:bg-primary-light text-white text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {aiStatus === 'testing' ? 'Testing…' : aiKey.trim() ? 'Save' : 'Clear'}
              </button>
            </div>

            {aiStatus === 'ok' && (
              <p className="text-[10px] text-green-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Key verified. Magic Enhance is ready.
              </p>
            )}
            {aiStatus === 'error' && aiError && (
              <p role="alert" className="text-[10px] text-red-400 leading-relaxed">{aiError}</p>
            )}
            {aiStatus === 'idle' && aiKeySaved && (
              <p className="text-[10px] text-muted">A key is saved on this device.</p>
            )}

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
            >
              Get a free key from Google AI Studio
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          </div>
        </section>

        {/* Help & Support */}
        <section>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Help & Support</h3>

          {/* All three buttons used to open the same feedback form, so a user
              asking "how do I use this?" was handed a blank text box. */}
          <button
            onClick={() => setScreen(Screen.HELP)}
            className="w-full mb-2 bg-surface-dark rounded-xl border border-white/5 p-4 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-blue-400">help</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">How Tempo works</p>
              <p className="text-[10px] text-muted">Presets, sounds, sync, and the mini timer</p>
            </div>
            <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
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
            <button
              onClick={async () => {
                // This used to only change screens, leaving the session intact:
                // reopening the popup dropped the user straight back in, still
                // signed in. signOut() revokes the token and clears the flags.
                try {
                  await authService.signOut();
                } catch (e) {
                  console.error('[Tempo] Sign out failed:', e);
                }
                setScreen(Screen.LOGIN);
              }}
              className="text-[10px] font-semibold text-red-400/70 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="text-[9px] text-muted/30 text-center">{config.app.name} v{config.app.version}</p>
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

      {/* Theme Selection Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-dark rounded-2xl border border-white/10 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-bold">App Theme</h3>
                <p className="text-[10px] text-muted">{THEMES.length} themes available</p>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-muted">close</span>
              </button>
            </div>

            {/* Scrollable Theme Grid */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {/* All themes — every theme is free */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">All themes</span>
                  <div className="flex-1 h-px bg-white/5"></div>
                  <span className="text-[10px] text-muted">{THEMES.length} themes</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {THEMES.map(theme => {
                    const isActive = activeTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme.id)}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${isActive
                          ? 'border-white/40 bg-white/10 scale-105'
                          : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                          }`}
                      >
                        <div className="relative">
                          <div
                            className={`w-12 h-12 rounded-full ${theme.color} shadow-lg transition-all ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-dark' : ''
                              }`}
                          ></div>
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="material-symbols-outlined text-white text-lg drop-shadow-lg">check</span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold leading-tight text-center ${isActive ? 'text-white' : 'text-muted'
                          }`}>{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 shrink-0">
              <button
                onClick={() => setShowThemeModal(false)}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
