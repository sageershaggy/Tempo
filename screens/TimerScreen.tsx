import React, { useState, useEffect, useRef } from 'react';
import { Screen, GlobalProps } from '../types';
import { configManager, AudioTrackConfig } from '../config';
import { STORAGE_KEYS, formatTimer, UI_DIMENSIONS, extractYouTubeId } from '../config/constants';
import { getSettings } from '../services/storageService';
import { playSound, stopSound, setVolume as setSoundVolume, isBuiltInTrack } from '../services/soundGenerator';
import { playOffscreen, stopOffscreen, setOffscreenVolume, getOffscreenStatus, isOffscreenAvailable } from '../services/audioBridge';

type TimerMode = 'pomodoro' | 'deep' | 'custom';

// Use offscreen audio when available (Chrome extension), fallback to direct Web Audio
const useOffscreen = isOffscreenAvailable();

export const TimerScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState, currentTask }) => {
  // Load configuration dynamically
  const config = configManager.getConfig();
  const timerModes = config.timer.modes;
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
        } catch (e) {}
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
      const target = Date.now() + (timeLeft * 1000);
      localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));
    } else {
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
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
      <div className="flex p-0.5 bg-surface-dark rounded-lg mb-4 border border-white/5">
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
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center w-44 h-44 mb-4">
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
            <span className="text-[38px] font-black tracking-tight tabular-nums leading-none">{formatTimer(timeLeft)}</span>
            <span className="text-[9px] font-semibold text-muted mt-1 uppercase tracking-[0.15em]">{isActive ? 'Focusing' : 'Ready'}</span>
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

      {/* Current Task Card */}
      <div
        className="mt-4 w-full rounded-xl bg-surface-dark/80 border border-white/5 cursor-pointer hover:border-white/10 transition-all"
        onClick={() => setScreen(Screen.QUICK_ADD)}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-[9px] font-semibold text-muted uppercase tracking-wider mb-0.5">Current Task</p>
            <h3 className="text-white text-xs font-bold truncate">{currentTask?.title || 'No task selected'}</h3>
          </div>
          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xs text-muted">{currentTask ? 'edit' : 'add'}</span>
          </div>
        </div>
      </div>

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
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border ${
                soundFilter === cat
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
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                  isTrackActive
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-surface-dark border-white/5 hover:border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isTrackActive ? 'bg-primary text-white' : 'bg-white/5 text-muted'
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
            className={`px-3 rounded-lg flex items-center justify-center transition-colors ${
              youtubeUrl.trim()
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
    </div>
  );
};
