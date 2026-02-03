import React, { useState, useEffect, useRef } from 'react';
import { Screen, GlobalProps } from '../types';
import { configManager, AudioTrackConfig } from '../config';
import { STORAGE_KEYS, formatTimer, UI_DIMENSIONS, extractYouTubeId } from '../config/constants';
import { getSettings, updateStats } from '../services/storageService';
import { playSound, stopSound, setVolume as setSoundVolume, isBuiltInTrack } from '../services/soundGenerator';
import { playOffscreen, stopOffscreen, setOffscreenVolume, getOffscreenStatus, isOffscreenAvailable } from '../services/audioBridge';

// Use offscreen audio when available (Chrome extension), fallback to direct Web Audio
const useOffscreen = isOffscreenAvailable();

export const TimerScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState, currentTask, tasks, setTasks, setCurrentTask }) => {
  // Load configuration dynamically
  const config = configManager.getConfig();
  const templates = config.timer.templates;
  const TRACKS = config.audio.tracks;
  const CATEGORIES = config.audio.categories;

  // User settings for custom mode
  const [userFocusDuration, setUserFocusDuration] = useState(config.defaults.settings.focusDuration);
  const [userBreakDuration, setUserBreakDuration] = useState(config.defaults.settings.shortBreak);
  const [tickingEnabled, setTickingEnabled] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(60);
  const tickIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound panel state
  const [soundFilter, setSoundFilter] = useState('All');
  const [showAllSounds, setShowAllSounds] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Task Selector State
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);

  // Beat counter state
  const [beatEnabled, setBeatEnabled] = useState(false);
  const [beatInterval, setBeatInterval] = useState(1); // 1, 2, or 3 seconds
  const [beatCount, setBeatCount] = useState(0);
  const beatIntervalRef = useRef<any>(null);
  const beatAudioCtxRef = useRef<AudioContext | null>(null);

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      category: 'Work',
      priority: 'Medium' as const,
      completed: false,
      subtasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setTasks(prev => [newTask, ...prev]);
    setCurrentTask(newTask);
    setNewTaskTitle('');
    setShowTaskSelector(false);
  };

  // Get initial time from a template
  const getTimeForTemplate = (templateId: string): number => {
    const tmpl = templates.find(t => t.id === templateId);
    return tmpl ? tmpl.focusMinutes * 60 : config.defaults.settings.focusDuration * 60;
  };

  const getBreakForTemplate = (templateId: string): number => {
    const tmpl = templates.find(t => t.id === templateId);
    return tmpl ? tmpl.breakMinutes * 60 : config.defaults.settings.shortBreak * 60;
  };

  const [activeTemplateId, setActiveTemplateId] = useState(templates[0]?.id || 'classic');
  const [timeLeft, setTimeLeft] = useState(getTimeForTemplate(templates[0]?.id || 'classic'));
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(getTimeForTemplate(templates[0]?.id || 'classic'));

  // Load user settings for ticking
  useEffect(() => {
    const loadUserSettings = async () => {
      const settings = await getSettings();
      setUserFocusDuration(settings.focusDuration);
      setUserBreakDuration(settings.shortBreak);
      setTickingEnabled(settings.tickingEnabled);
      setTickSpeed(settings.tickingSpeed);
    };
    loadUserSettings();
  }, []);

  // Auto-start timer when coming from QuickAdd with "Start Timer" toggle on
  useEffect(() => {
    const autoStart = localStorage.getItem('tempo_autoStartTimer');
    if (autoStart === 'true') {
      localStorage.removeItem('tempo_autoStartTimer');
      setTimeout(() => {
        setIsActive(true);
        const target = Date.now() + (timeLeft * 1000);
        localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));
        localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, 'true');
        localStorage.setItem(STORAGE_KEYS.TIMER_MODE, activeTemplateId);
      }, 100);
    }
  }, []);

  // Ticking sound effect
  useEffect(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (isActive && tickingEnabled && tickSpeed > 0) {
      const playTick = async () => {
        try {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 1200;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.03);
        } catch (e) { }
      };

      const intervalMs = (60 / tickSpeed) * 1000;
      playTick();
      tickIntervalRef.current = setInterval(playTick, intervalMs);
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [isActive, tickingEnabled, tickSpeed]);

  // Beat counter effect
  useEffect(() => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }

    if (isActive && beatEnabled) {
      setBeatCount(0);
      const playBeat = () => {
        setBeatCount(prev => prev + 1);
        try {
          if (!beatAudioCtxRef.current || beatAudioCtxRef.current.state === 'closed') {
            beatAudioCtxRef.current = new AudioContext();
          }
          const ctx = beatAudioCtxRef.current;
          if (ctx.state === 'suspended') ctx.resume();
          // Deep resonant beat sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 220;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
      };

      playBeat();
      beatIntervalRef.current = setInterval(playBeat, beatInterval * 1000);
    } else {
      setBeatCount(0);
    }

    return () => {
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
        beatIntervalRef.current = null;
      }
    };
  }, [isActive, beatEnabled, beatInterval]);

  // Update timer when template changes
  useEffect(() => {
    setIsActive(false);
    const newTime = getTimeForTemplate(activeTemplateId);
    setInitialTime(newTime);
    setTimeLeft(newTime);
  }, [activeTemplateId]);

  // Load timer state on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
    const savedTemplateId = localStorage.getItem(STORAGE_KEYS.TIMER_MODE);
    const savedIsActive = localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true';

    if (savedTemplateId && templates.find(t => t.id === savedTemplateId)) {
      setActiveTemplateId(savedTemplateId);
    }

    if (savedIsActive && savedTarget) {
      const targetTime = parseInt(savedTarget, 10);
      const now = Date.now();
      const diff = Math.ceil((targetTime - now) / 1000);

      if (diff > 0) {
        setTimeLeft(diff);
        setIsActive(true);
      } else {
        setTimeLeft(0);
        setIsActive(false);
        localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
        localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);
      }
    }
  }, []);

  // Timer Tick & Persistence
  useEffect(() => {
    let interval: any;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(() => {
          const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
          if (savedTarget) {
            const diff = Math.ceil((parseInt(savedTarget) - Date.now()) / 1000);
            return diff > 0 ? diff : 0;
          }
          return 0;
        });
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
      localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);

      // Record completed session in stats
      const sessionMinutes = Math.round(initialTime / 60);
      updateStats(sessionMinutes).catch(err => console.error('Failed to update stats:', err));

      if (audioState.isPlaying && audioState.autoPlay) {
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      }

      // Show in-app completion notification
      setShowCompletionNotification(true);

      // Send Chrome notification via background service worker & clear badge
      try {
        const w = window as any;
        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage({ action: 'timerComplete' });
          w.chrome.runtime.sendMessage({ action: 'stopTimer' });
        }
      } catch (e) {
        // Not in extension context
      }

      // Also use Notification API as fallback for non-extension context
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Session Complete!', {
          body: 'Great work! Time for a break.',
          icon: '/icons/icon128_v3.png',
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, String(newActive));
    localStorage.setItem(STORAGE_KEYS.TIMER_MODE, activeTemplateId);

    if (newActive) {
      const target = Date.now() + (timeLeft * 1000);
      localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));

      // Update extension badge with timer (send exact seconds for real-time badge)
      try {
        const w = window as any;
        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage({ action: 'startTimer', seconds: timeLeft });
        }
      } catch (e) {}
    } else {
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);

      // Clear extension badge
      try {
        const w = window as any;
        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage({ action: 'stopTimer' });
        }
      } catch (e) {}
    }
  };

  // On mount, check if offscreen audio is already playing (persisted from previous popup open)
  useEffect(() => {
    if (useOffscreen) {
      getOffscreenStatus().then(status => {
        if (status.isPlaying && status.trackId) {
          setAudioState(prev => ({
            ...prev,
            isPlaying: true,
            activeTrackId: status.trackId,
          }));
        }
      });
    }
  }, []);

  // Sync volume changes
  useEffect(() => {
    if (audioState.isPlaying && audioState.activeTrackId && isBuiltInTrack(audioState.activeTrackId)) {
      const trackVol = (audioState.trackSettings[audioState.activeTrackId]?.volume ?? 50) / 100;
      const finalVol = trackVol * (audioState.volume / 100);
      if (useOffscreen) {
        setOffscreenVolume(finalVol);
      } else {
        setSoundVolume(finalVol);
      }
    }
  }, [audioState.volume, audioState.trackSettings, audioState.activeTrackId]);

  // Stop sound when audioState says not playing
  useEffect(() => {
    if (!audioState.isPlaying) {
      if (useOffscreen) {
        stopOffscreen();
      } else {
        stopSound();
      }
    }
  }, [audioState.isPlaying]);

  // Handle toggling a track
  const handleToggleTrack = async (track: AudioTrackConfig) => {
    const isCurrent = audioState.activeTrackId === track.id && audioState.isPlaying;
    if (isCurrent) {
      if (useOffscreen) {
        await stopOffscreen();
      } else {
        stopSound();
      }
      setAudioState(prev => ({ ...prev, isPlaying: false, activeTrackId: null }));
    } else {
      if (useOffscreen) {
        await stopOffscreen();
      } else {
        stopSound();
      }
      if (isBuiltInTrack(track.id)) {
        const vol = (audioState.trackSettings[track.id]?.volume ?? 50) / 100 * (audioState.volume / 100);
        if (useOffscreen) {
          await playOffscreen(track.id, Math.max(0.01, vol));
        } else {
          await playSound(track.id, Math.max(0.01, vol));
        }
      }
      setAudioState(prev => ({
        ...prev,
        isPlaying: true,
        activeTrackId: track.id,
        youtubeId: null,
      }));
    }
  };

  const handleYoutubePlay = () => {
    const videoId = extractYouTubeId(youtubeUrl);
    if (videoId) {
      if (useOffscreen) { stopOffscreen(); } else { stopSound(); }
      setAudioState(prev => ({
        ...prev,
        isPlaying: true,
        activeTrackId: null,
        youtubeId: videoId,
      }));
      setYoutubeUrl('');
    }
  };

  const filteredTracks = soundFilter === 'All'
    ? TRACKS.filter(t => isBuiltInTrack(t.id))
    : TRACKS.filter(t => t.category === soundFilter && isBuiltInTrack(t.id));

  // Show max 6 tracks when collapsed, all when expanded
  const displayTracks = showAllSounds ? filteredTracks : filteredTracks.slice(0, 6);

  return (
    <div className="h-full flex flex-col px-5 pt-3 pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-base font-bold tracking-tight">Tempo</h1>
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
            {templates.find(t => t.id === activeTemplateId)?.description || 'Focus Session'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mini Floating Timer Button */}
          <button
            onClick={() => {
              try {
                const w = window as any;
                // Position in top-right corner of screen
                const top = 50;
                const left = screen.availWidth - 170;

                if (w.chrome?.windows?.create) {
                  w.chrome.windows.create({
                    url: w.chrome.runtime.getURL('mini-timer.html'),
                    type: 'popup',
                    width: 160,
                    height: 72,
                    top: top,
                    left: left,
                    focused: false
                  });
                } else {
                  window.open(
                    (w.chrome?.runtime?.getURL?.('mini-timer.html')) || 'mini-timer.html',
                    'TempoMini',
                    `width=160,height=72,top=${top},left=${left},toolbar=no,menubar=no,location=no,status=no,resizable=no`
                  );
                }
              } catch (e) {
                console.error('Failed to open mini timer:', e);
              }
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Floating Mini Timer"
          >
            <span className="material-symbols-outlined text-[18px]">pip</span>
          </button>
          <button
            onClick={() => {
              try { window.open((window as any).chrome.runtime.getURL('index.html')); } catch (e) { window.open(window.location.href); }
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Open in new tab"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
          <button onClick={() => setScreen(Screen.SETTINGS)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>
      </div>

      {/* Template Switcher */}
      <div className="flex p-0.5 bg-surface-dark rounded-lg mb-4 border border-white/5">
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setActiveTemplateId(tmpl.id)}
            className={`flex-1 py-2 rounded-md text-[11px] font-semibold transition-all ${activeTemplateId === tmpl.id ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-muted hover:text-white/70'}`}
          >
            {tmpl.focusMinutes}/{tmpl.breakMinutes}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative flex items-center justify-center w-64 h-64 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle className="stroke-surface-light" cx="50" cy="50" fill="transparent" r="44" strokeWidth="4" />
            <circle
              className="stroke-primary transition-all duration-1000 ease-linear"
              cx="50" cy="50"
              fill="transparent" r="44"
              strokeWidth="4"
              strokeDasharray="276.5"
              strokeDashoffset={276.5 - ((initialTime - timeLeft) / initialTime) * 276.5}
              strokeLinecap="round"
              style={{ filter: isActive ? 'drop-shadow(0 0 12px var(--color-primary))' : 'none' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-6xl font-black tracking-tight tabular-nums leading-none">{formatTimer(timeLeft)}</span>
            <span className="text-xs font-bold text-muted mt-2 uppercase tracking-[0.2em]">{isActive ? 'Focusing' : 'Ready'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTimer}
            className={`px-10 py-2.5 rounded-full font-bold text-sm tracking-wide flex items-center gap-2 transition-all active:scale-95 ${isActive
              ? 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
              : 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'
              }`}
          >
            <span className="material-symbols-outlined text-lg">{isActive ? 'pause' : 'play_arrow'}</span>
            {isActive ? 'PAUSE' : 'START FOCUS'}
          </button>
          {(isActive || timeLeft < initialTime) && (
            <button
              onClick={() => {
                setIsActive(false);
                const newTime = getTimeForTemplate(activeTemplateId);
                setInitialTime(newTime);
                setTimeLeft(newTime);
                localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
                localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);
                try {
                  const w = window as any;
                  if (w.chrome?.runtime?.sendMessage) {
                    w.chrome.runtime.sendMessage({ action: 'stopTimer' });
                  }
                } catch (e) {}
              }}
              className="w-10 h-10 rounded-full bg-white/10 text-white border border-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              title="Reset Timer"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
            </button>
          )}
        </div>
      </div>

      {/* Focus Beat */}
      <div className="mt-3 w-full rounded-xl bg-surface-dark/80 border border-white/5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">music_note</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Focus Beat</span>
            {isActive && beatEnabled && (
              <span className="text-[10px] font-bold text-primary tabular-nums">{beatCount}</span>
            )}
          </div>
          <button
            onClick={() => setBeatEnabled(!beatEnabled)}
            className={`w-9 h-5 rounded-full transition-colors relative ${beatEnabled ? 'bg-primary' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${beatEnabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
        {beatEnabled && (
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-[10px] text-muted shrink-0">Every</span>
            <div className="relative">
              <select
                value={beatInterval}
                onChange={(e) => setBeatInterval(Number(e.target.value))}
                className="appearance-none bg-white/5 border border-white/10 text-xs font-bold text-white rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
              >
                {Array.from({ length: 60 }, (_, i) => i + 1).map(s => (
                  <option key={s} value={s} className="bg-surface-dark text-white">{s}s</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[10px] text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>
            <span className="text-[10px] text-muted">sec</span>
          </div>
        )}
      </div>

      {/* Current Task Card */}
      <div className="mt-3 w-full rounded-xl bg-surface-dark/80 border border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center p-3">
          {/* Complete task button */}
          {currentTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTasks(prev => prev.map(t => t.id === currentTask.id ? { ...t, completed: true, updatedAt: Date.now() } : t));
                setCurrentTask(null);
              }}
              className="w-6 h-6 rounded-full border-2 border-muted hover:border-green-400 hover:bg-green-400/10 flex items-center justify-center shrink-0 mr-3 transition-colors group"
              title="Complete task"
            >
              <span className="material-symbols-outlined text-[12px] text-transparent group-hover:text-green-400 transition-colors">check</span>
            </button>
          )}
          <div className="flex-1 min-w-0 mr-3 cursor-pointer" onClick={() => setShowTaskSelector(true)}>
            <p className="text-[9px] font-semibold text-muted uppercase tracking-wider mb-0.5">Current Task</p>
            <h3 className="text-white text-xs font-bold truncate">{currentTask?.title || 'No task selected'}</h3>
            {currentTask?.dueDate && (
              <div className="flex items-center gap-1 mt-1 text-secondary">
                <span className="material-symbols-outlined text-[10px]">event</span>
                <span className="text-[10px] font-medium">
                  {new Date(currentTask.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {new Date(currentTask.dueDate) < new Date() ? ' (Overdue)' : ''}
                </span>
              </div>
            )}
          </div>
          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => setShowTaskSelector(true)}>
            <span className="material-symbols-outlined text-xs text-muted">expand_more</span>
          </div>
        </div>
      </div>

      {/* Task Selector Modal */}
      {showTaskSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowTaskSelector(false)}>
          <div className="w-full max-w-sm bg-surface-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-surface-light/30">
              <h3 className="text-sm font-bold ml-1">Select Task</h3>
              <button onClick={() => setShowTaskSelector(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-3 border-b border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Create new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary/50 outline-none"
                  autoFocus
                />
                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-3 bg-primary rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-white">add</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => { setCurrentTask(null); setShowTaskSelector(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/5 ${!currentTask ? 'bg-primary/10 text-primary' : 'text-muted'}`}
              >
                <span className="material-symbols-outlined text-sm">block</span>
                <span className="text-xs font-medium">No Task</span>
              </button>

              {tasks.filter(t => !t.completed).map(task => (
                <button
                  key={task.id}
                  onClick={() => { setCurrentTask(task); setShowTaskSelector(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border border-transparent transition-all hover:bg-white/5 group ${currentTask?.id === task.id ? 'bg-primary/10 border-primary/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium truncate ${currentTask?.id === task.id ? 'text-primary' : 'text-white'}`}>
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className={`text-[10px] ${new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-muted'}`}>
                        {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {tasks.filter(t => !t.completed).length === 0 && (
                <div className="text-center py-8 text-muted">
                  <span className="material-symbols-outlined text-2xl mb-1 opacity-50">inbox</span>
                  <p className="text-[10px]">No active tasks found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== FOCUS SOUNDS SECTION ========== */}
      <div className="mt-4 w-full">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">graphic_eq</span>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Focus Sounds</p>
          </div>
          {/* Now Playing indicator */}
          {audioState.isPlaying && audioState.activeTrackId && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[9px] font-semibold text-green-400">
                {TRACKS.find(t => t.id === audioState.activeTrackId)?.name}
              </span>
              <button
                onClick={() => {
                  stopSound();
                  setAudioState(prev => ({ ...prev, isPlaying: false, activeTrackId: null }));
                }}
                className="ml-1 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[10px] text-muted">close</span>
              </button>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
          {['All', 'Binaural', 'Solfeggio', 'Noise'].map(cat => (
            <button
              key={cat}
              onClick={() => setSoundFilter(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border ${soundFilter === cat
                ? 'bg-white text-black border-white'
                : 'bg-white/5 text-muted border-white/5 hover:bg-white/10'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sound Grid */}
        <div className="grid grid-cols-2 gap-2">
          {displayTracks.map((track) => {
            const isTrackActive = audioState.activeTrackId === track.id && audioState.isPlaying;
            return (
              <button
                key={track.id}
                onClick={() => handleToggleTrack(track)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${isTrackActive
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-surface-dark border-white/5 hover:border-white/10'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isTrackActive ? 'bg-primary text-white' : 'bg-white/5 text-muted'
                  }`}>
                  <span className="material-symbols-outlined text-sm">
                    {isTrackActive ? 'pause' : track.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold truncate ${isTrackActive ? 'text-white' : 'text-white/80'}`}>
                    {track.name}
                  </p>
                  {track.hz ? (
                    <p className="text-[9px] font-bold text-secondary">{track.hz}</p>
                  ) : (
                    <p className="text-[9px] text-muted">{track.category}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Show More / Less */}
        {filteredTracks.length > 6 && (
          <button
            onClick={() => setShowAllSounds(!showAllSounds)}
            className="w-full mt-2 py-1.5 text-[10px] font-semibold text-primary hover:text-primary-light transition-colors flex items-center justify-center gap-1"
          >
            {showAllSounds ? 'Show Less' : `Show All (${filteredTracks.length})`}
            <span className="material-symbols-outlined text-xs">{showAllSounds ? 'expand_less' : 'expand_more'}</span>
          </button>
        )}

        {/* Volume Control (shows when something is playing) */}
        {(audioState.isPlaying && (audioState.activeTrackId || audioState.youtubeId)) && (
          <div className="mt-2 flex items-center gap-2 bg-surface-dark/80 rounded-lg border border-white/5 px-3 py-2">
            <span className="material-symbols-outlined text-xs text-muted">volume_down</span>
            <input
              type="range"
              min="0" max="100" step="5"
              value={audioState.volume}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAudioState(prev => ({ ...prev, volume: val }));
              }}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
            />
            <span className="text-[10px] font-mono text-muted w-7 text-right">{audioState.volume}%</span>
          </div>
        )}

        {/* YouTube URL Input */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Paste YouTube link for custom audio..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleYoutubePlay()}
            className="flex-1 bg-surface-dark border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white placeholder-muted/50 focus:outline-none focus:border-primary/40 transition-colors"
          />
          <button
            onClick={handleYoutubePlay}
            disabled={!youtubeUrl.trim()}
            className={`px-3 rounded-lg flex items-center justify-center transition-colors ${youtubeUrl.trim()
              ? 'bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30'
              : 'bg-white/5 text-muted/30 border border-white/5'
              }`}
          >
            <span className="material-symbols-outlined text-base">play_circle</span>
          </button>
        </div>

        {/* YouTube Now Playing */}
        {audioState.isPlaying && audioState.youtubeId && !audioState.activeTrackId && (
          <div className="mt-2 flex items-center gap-2 bg-red-500/5 rounded-lg border border-red-500/10 px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0"></span>
            <span className="material-symbols-outlined text-xs text-red-400">smart_display</span>
            <span className="text-[10px] font-semibold text-white/70 flex-1">YouTube Audio Playing</span>
            <button
              onClick={() => {
                setAudioState(prev => ({ ...prev, isPlaying: false, youtubeId: null }));
              }}
              className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[10px] text-muted">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Session Complete Notification Modal */}
      {showCompletionNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-surface-dark rounded-2xl border border-white/10 p-6 shadow-2xl text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-green-400">celebration</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Session Complete!</h3>
            <p className="text-sm text-muted mb-5">Great work! Time for a break.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCompletionNotification(false);
                  const breakTime = getBreakForTemplate(activeTemplateId);
                  setInitialTime(breakTime);
                  setTimeLeft(breakTime);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors"
              >
                Start Break
              </button>
              <button
                onClick={() => setShowCompletionNotification(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
