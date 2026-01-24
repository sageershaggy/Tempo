import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { configManager } from '../config';
import { STORAGE_KEYS, formatTimer, UI_DIMENSIONS } from '../config/constants';

type TimerMode = 'pomodoro' | 'deep' | 'custom';

export const TimerScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState, currentTask }) => {
  // Load configuration dynamically
  const config = configManager.getConfig();
  const timerModes = config.timer.modes;

  // Get initial values from config
  const getTimeForMode = (modeId: string): number => {
    const modeConfig = timerModes.find(m => m.id === modeId);
    return modeConfig ? modeConfig.focusMinutes * 60 : config.defaults.settings.focusDuration * 60;
  };

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(getTimeForMode('pomodoro'));
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(getTimeForMode('pomodoro'));

  // Update timer when mode changes
  useEffect(() => {
    setIsActive(false);
    const newTime = getTimeForMode(mode);
    setInitialTime(newTime);
    setTimeLeft(newTime);
  }, [mode]);

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

  const progress = ((initialTime - timeLeft) / initialTime) * UI_DIMENSIONS.TIMER_CIRCUMFERENCE;

  return (
    <div className="h-full flex flex-col px-6 pt-4 pb-20 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-lg font-bold">Tempo</h1>
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
            {timerModes.find(m => m.id === mode)?.name || 'Focus Session'}
          </p>
        </div>
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-surface-light/80">
          <span className="material-symbols-outlined text-lg">tune</span>
        </button>
      </div>

      {/* Mode Switcher - Dynamic from config */}
      <div className="flex p-1 bg-surface-light rounded-xl mb-4 border border-white/5">
        {timerModes.map((modeConfig) => (
          <button
            key={modeConfig.id}
            onClick={() => setMode(modeConfig.id as TimerMode)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${mode === modeConfig.id ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-white'}`}
          >
            {modeConfig.label}
          </button>
        ))}
      </div>

      {/* Timer Circle - Compact */}
      <div className="relative flex items-center justify-center w-48 h-48 mx-auto mb-6 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle className="text-surface-light stroke-current" cx="50" cy="50" fill="transparent" r="45" strokeWidth="6" />
          <circle
            className="text-primary stroke-current transition-all duration-1000 ease-linear drop-shadow-[0_0_15px_rgba(127,19,236,0.4)]"
            cx="50" cy="50"
            fill="transparent" r="45"
            strokeWidth="6"
            strokeDasharray="283"
            strokeDashoffset={283 - progress}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-black tracking-tighter tabular-nums">{formatTimer(timeLeft)}</span>
          <span className="text-[10px] font-medium text-muted mt-1 uppercase tracking-widest">{isActive ? 'Focusing' : 'Ready'}</span>
        </div>
      </div>

      {/* Main Action */}
      <div className="w-full max-w-[200px] mx-auto mb-4">
        <button
          onClick={toggleTimer}
          className={`w-full h-10 rounded-xl font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isActive ? 'bg-surface-light text-white' : 'bg-secondary text-white shadow-[0_4px_20px_-4px_rgba(255,107,107,0.5)]'}`}
        >
          <span className="material-symbols-outlined text-lg">{isActive ? 'pause' : 'play_arrow'}</span>
          {isActive ? 'PAUSE' : 'START FOCUS'}
        </button>
      </div>

      {/* Current Task Card - Compact */}
      <div className="relative w-full rounded-xl bg-surface-dark p-px border border-white/5 overflow-hidden group cursor-pointer" onClick={() => setScreen(Screen.QUICK_ADD)}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all"></div>
        <div className="relative z-10 flex items-center justify-between p-3 bg-background-dark/50 backdrop-blur-sm rounded-xl">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${currentTask ? 'bg-primary animate-pulse' : 'bg-muted'}`}></span>
              <p className="text-primary text-[10px] font-bold uppercase tracking-wider">Current Task</p>
            </div>
            <h3 className="text-white text-sm font-bold truncate">{currentTask?.title || 'No task selected'}</h3>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm">{currentTask ? 'edit' : 'add'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};