import React, { useState, useEffect, useRef } from 'react';
import { Screen, GlobalProps } from '../types';
import { configManager, AudioTrackConfig } from '../config';
import { STORAGE_KEYS, formatTimer, UI_DIMENSIONS } from '../config/constants';
import { getSettings } from '../services/storageService';
import { playSound, stopSound, isBuiltInTrack } from '../services/soundGenerator';

type TimerMode = 'pomodoro' | 'deep' | 'custom';

export const TimerScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState, currentTask }) => {
  // Load configuration dynamically
  const config = configManager.getConfig();
  const timerModes = config.timer.modes;

  // User settings for custom mode
  const [userFocusDuration, setUserFocusDuration] = useState(config.defaults.settings.focusDuration);
  const [userBreakDuration, setUserBreakDuration] = useState(config.defaults.settings.shortBreak);
  const [tickingEnabled, setTickingEnabled] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(60);
  const tickIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Get initial values from config, using user settings for custom mode
  const getTimeForMode = (modeId: string, customFocus?: number): number => {
    if (modeId === 'custom') {
      return (customFocus ?? userFocusDuration) * 60;
    }
    const modeConfig = timerModes.find(m => m.id === modeId);
    return modeConfig ? modeConfig.focusMinutes * 60 : config.defaults.settings.focusDuration * 60;
  };

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(getTimeForMode('pomodoro'));
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(getTimeForMode('pomodoro'));

  // Load user settings for custom mode and ticking
  useEffect(() => {
    const loadUserSettings = async () => {
      const settings = await getSettings();
      setUserFocusDuration(settings.focusDuration);
      setUserBreakDuration(settings.shortBreak);
      setTickingEnabled(settings.tickingEnabled);
      setTickSpeed(settings.tickingSpeed);
      // If currently on custom mode, update the timer to reflect settings
      if (mode === 'custom' && !isActive) {
        const newTime = settings.focusDuration * 60;
        setInitialTime(newTime);
        setTimeLeft(newTime);
      }
    };
    loadUserSettings();
  }, []);

  // Auto-start timer when coming from QuickAdd with "Start Timer" toggle on
  useEffect(() => {
    const autoStart = localStorage.getItem('tempo_autoStartTimer');
    if (autoStart === 'true') {
      localStorage.removeItem('tempo_autoStartTimer');
      // Small delay to ensure timer state is loaded
      setTimeout(() => {
        setIsActive(true);
        const target = Date.now() + (timeLeft * 1000);
        localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));
        localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, 'true');
        localStorage.setItem(STORAGE_KEYS.TIMER_MODE, mode);
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
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          // Resume if suspended (browser requires user gesture first)
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          // Use a woodblock-like tick: short, sharp click
          osc.frequency.value = 1200;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.03);
        } catch (e) {
          // Audio context may fail silently
        }
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

  // Update timer when mode changes
  useEffect(() => {
    setIsActive(false);
    const newTime = getTimeForMode(mode);
    setInitialTime(newTime);
    setTimeLeft(newTime);
  }, [mode, userFocusDuration]);

  // Load timer state on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
    const savedMode = localStorage.getItem(STORAGE_KEYS.TIMER_MODE) as TimerMode;
    const savedIsActive = localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true';

    if (savedMode) setMode(savedMode);

    if (savedIsActive && savedTarget) {
      const targetTime = parseInt(savedTarget, 10);
      const now = Date.now();
      const diff = Math.ceil((targetTime - now) / 1000);

      if (diff > 0) {
        setTimeLeft(diff);
        setIsActive(true);
      } else {
        // Timer finished while closed
        setTimeLeft(0);
        setIsActive(false);
        localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
        localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);
      }
    } else {
      // Not active, just ensure mode is correct (handled by setMode above)
    }
  }, []);

  // Timer Tick & Persistence
  useEffect(() => {
    let interval: any;

    if (isActive && timeLeft > 0) {
      // Save state
      const targetTime = Date.now() + (timeLeft * 1000);
      // We only want to set the target ONCE when starting or resuming to avoid drift, 
      // but for this simple implementation, updating it is okay or we check if it exists.
      // Better: ONLY set localStorage if we just started.
      // Actually, simplest is:
      // If we are active, we trust the `tempo_timer_target` in storage is the truth source.
      // But we need to decrement `timeLeft` for the UI.

      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          // Sync with wall clock every tick to be sure
          const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
          if (savedTarget) {
            const diff = Math.ceil((parseInt(savedTarget) - Date.now()) / 1000);
            return diff > 0 ? diff : 0;
          }
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
      localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);

      if (audioState.isPlaying && audioState.autoPlay) {
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, String(newActive));
    localStorage.setItem(STORAGE_KEYS.TIMER_MODE, mode);

    if (newActive) {
      // Starting
      const target = Date.now() + (timeLeft * 1000);
      localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));
    } else {
      // Pausing
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
    }
  };

  // Handle Auto-Play Logic
  useEffect(() => {
    if (isActive && audioState.autoPlay && !audioState.isPlaying) {
      // If no track selected, default to first (Gamma Focus) or keep current if paused
      setAudioState(prev => ({
        ...prev,
        isPlaying: true,
        activeTrackId: prev.activeTrackId || prev.youtubeId ? prev.activeTrackId : '1'
      }));
    } else if (!isActive && audioState.autoPlay && audioState.isPlaying) {
      // Pause audio when timer pauses
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [isActive, audioState.autoPlay, audioState.isPlaying, audioState.youtubeId, setAudioState]);

  // Quick audio picks for the timer screen (curated focus sounds)
  const quickAudioTracks = config.audio.tracks.filter(t =>
    ['1', '2', '3', '8', '10', '4'].includes(t.id)
  );

  const handleQuickAudio = (track: AudioTrackConfig) => {
    const isCurrentlyPlaying = audioState.activeTrackId === track.id && audioState.isPlaying;
    if (isCurrentlyPlaying) {
      stopSound();
      setAudioState(prev => ({ ...prev, isPlaying: false, activeTrackId: null }));
    } else {
      stopSound();
      if (isBuiltInTrack(track.id)) {
        const vol = (audioState.trackSettings[track.id]?.volume ?? 50) / 100 * (audioState.volume / 100);
        playSound(track.id, vol);
      }
      setAudioState(prev => ({
        ...prev,
        isPlaying: true,
        activeTrackId: track.id,
        youtubeId: null,
      }));
    }
  };

  const progress = ((initialTime - timeLeft) / initialTime) * UI_DIMENSIONS.TIMER_CIRCUMFERENCE;

  return (
    <div className="h-full flex flex-col px-5 pt-3 pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-base font-bold tracking-tight">Tempo</h1>
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
            {timerModes.find(m => m.id === mode)?.name || 'Focus Session'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
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

      {/* Mode Switcher */}
      <div className="flex p-0.5 bg-surface-dark rounded-lg mb-5 border border-white/5">
        {timerModes.map((modeConfig) => (
          <button
            key={modeConfig.id}
            onClick={() => setMode(modeConfig.id as TimerMode)}
            className={`flex-1 py-2 rounded-md text-[11px] font-semibold transition-all ${mode === modeConfig.id ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-muted hover:text-white/70'}`}
          >
            {modeConfig.id === 'custom' ? `${userFocusDuration}/${userBreakDuration}` : modeConfig.label}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-2">
        <div className="relative flex items-center justify-center w-52 h-52 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle className="stroke-surface-light" cx="50" cy="50" fill="transparent" r="44" strokeWidth="5" />
            <circle
              className="stroke-primary transition-all duration-1000 ease-linear"
              cx="50" cy="50"
              fill="transparent" r="44"
              strokeWidth="5"
              strokeDasharray="276.5"
              strokeDashoffset={276.5 - ((initialTime - timeLeft) / initialTime) * 276.5}
              strokeLinecap="round"
              style={{ filter: isActive ? 'drop-shadow(0 0 8px var(--color-primary))' : 'none' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[42px] font-black tracking-tight tabular-nums leading-none">{formatTimer(timeLeft)}</span>
            <span className="text-[10px] font-semibold text-muted mt-1.5 uppercase tracking-[0.15em]">{isActive ? 'Focusing' : 'Ready'}</span>
          </div>
        </div>

        {/* Action Button */}
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
      </div>

      {/* Focus Audio Quick Controls */}
      <div className="mt-5 w-full">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Focus Sound</p>
          <button
            onClick={() => setScreen(Screen.AUDIO)}
            className="text-[10px] font-semibold text-primary hover:text-primary-light transition-colors flex items-center gap-0.5"
          >
            All Sounds
            <span className="material-symbols-outlined text-xs">chevron_right</span>
          </button>
        </div>

        {/* Quick Sound Picks */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {/* Off button */}
          <button
            onClick={() => {
              stopSound();
              setAudioState(prev => ({ ...prev, isPlaying: false, activeTrackId: null }));
            }}
            className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
              !audioState.isPlaying || !audioState.activeTrackId
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-surface-dark border-white/5 text-muted hover:border-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-base">volume_off</span>
            <span className="text-[8px] font-bold">Off</span>
          </button>

          {/* Quick pick tracks */}
          {quickAudioTracks.map((track) => {
            const isActive = audioState.activeTrackId === track.id && audioState.isPlaying;
            return (
              <button
                key={track.id}
                onClick={() => handleQuickAudio(track)}
                className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-surface-dark border-white/5 text-muted hover:border-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">{track.icon}</span>
                <span className="text-[8px] font-bold truncate max-w-[48px]">{track.hz || track.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Now Playing Mini Bar */}
        {audioState.isPlaying && audioState.activeTrackId && (
          <div className="mt-2 flex items-center gap-2 bg-surface-dark/80 rounded-lg border border-white/5 px-3 py-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0"></span>
              <span className="text-[10px] font-semibold text-white/80 truncate">
                {config.audio.tracks.find(t => t.id === audioState.activeTrackId)?.name || 'Playing'}
              </span>
              {config.audio.tracks.find(t => t.id === audioState.activeTrackId)?.hz && (
                <span className="text-[9px] font-bold text-secondary">{config.audio.tracks.find(t => t.id === audioState.activeTrackId)?.hz}</span>
              )}
            </div>
            <button
              onClick={() => {
                stopSound();
                setAudioState(prev => ({ ...prev, isPlaying: false }));
              }}
              className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-muted">stop</span>
            </button>
          </div>
        )}
      </div>

      {/* Current Task Card */}
      <div
        className="mt-3 w-full rounded-xl bg-surface-dark/80 border border-white/5 cursor-pointer hover:border-white/10 transition-all"
        onClick={() => setScreen(Screen.QUICK_ADD)}
      >
        <div className="flex items-center justify-between p-3.5">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Current Task</p>
            <h3 className="text-white text-sm font-bold truncate">{currentTask?.title || 'No task selected'}</h3>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm text-muted">{currentTask ? 'edit' : 'add'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};