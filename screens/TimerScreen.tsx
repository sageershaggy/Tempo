import React, { useState, useEffect, useRef } from 'react';
import { Screen, GlobalProps } from '../types';
import { configManager, AudioTrackConfig } from '../config';
import { STORAGE_KEYS, formatTimer, UI_DIMENSIONS, extractYouTubeId } from '../config/constants';
import { getSettings } from '../services/storageService';
import { playSound, stopSound, setVolume as setSoundVolume, isBuiltInTrack } from '../services/soundGenerator';
import {
  playOffscreen,
  stopOffscreen,
  setOffscreenVolume,
  setYouTubeOffscreenVolume,
  getOffscreenStatus,
  isOffscreenAvailable,
  playYouTubeOffscreen,
  stopYouTubeOffscreen,
  getYouTubeOffscreenStatus,
} from '../services/audioBridge';
import { googleTasksService } from '../services/googleTasks';

// Use offscreen audio when available (Chrome extension), fallback to direct Web Audio
const useOffscreen = isOffscreenAvailable();

interface TimerPreset {
  id: string;
  label: string;
  description: string;
  focusMinutes: number;
  breakMinutes: number;
}

const TIMER_PRESETS_STORAGE_KEY = 'tempo_timer_presets_v2';
const MAX_CUSTOM_TIMER_PRESETS = 4;
const TIMER_PRESET_SECTION_COLLAPSED_KEY = 'tempo_timer_preset_section_collapsed';

const toPositiveInt = (value: unknown, fallback: number, min: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.round(parsed));
};

const createDefaultPreset = (focusMinutes: number, breakMinutes: number): TimerPreset => {
  const safeFocus = toPositiveInt(focusMinutes, 25, 1);
  const safeBreak = toPositiveInt(breakMinutes, 5, 1);
  return {
    id: 'default',
    label: `${safeFocus}/${safeBreak}`,
    description: 'Default',
    focusMinutes: safeFocus,
    breakMinutes: safeBreak,
  };
};

const normalizePreset = (preset: any): TimerPreset | null => {
  if (!preset || typeof preset !== 'object') return null;
  const id = String(preset.id || '').trim();
  const focusMinutes = toPositiveInt(preset.focusMinutes, 25, 1);
  const breakMinutes = toPositiveInt(preset.breakMinutes, 5, 1);
  if (!id || id === 'default') return null;
  return {
    id,
    label: `${focusMinutes}/${breakMinutes}`,
    description: String(preset.description || 'Preset'),
    focusMinutes,
    breakMinutes,
  };
};

const loadTimerPresets = (fallbackFocus: number, fallbackBreak: number): TimerPreset[] => {
  const defaultPreset = createDefaultPreset(fallbackFocus, fallbackBreak);

  try {
    const raw = localStorage.getItem(TIMER_PRESETS_STORAGE_KEY);
    if (!raw) return [defaultPreset];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [defaultPreset];

    const customPresets = parsed
      .map(normalizePreset)
      .filter((preset): preset is TimerPreset => !!preset);

    return [defaultPreset, ...customPresets.slice(0, MAX_CUSTOM_TIMER_PRESETS)];
  } catch (e) {
    return [defaultPreset];
  }
};

const saveTimerPresets = (presets: TimerPreset[]) => {
  const customPresets = presets
    .filter(preset => preset.id !== 'default')
    .slice(0, MAX_CUSTOM_TIMER_PRESETS);
  localStorage.setItem(TIMER_PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
};

export const TimerScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState, currentTask, tasks, setTasks, setCurrentTask }) => {
  const REAL_RECORDING_TRACK_IDS = new Set(['6', '7', '11', '12', '13', '14', '15']);
  // Load configuration dynamically
  const config = configManager.getConfig();
  const [templates, setTemplates] = useState<TimerPreset[]>(() =>
    loadTimerPresets(config.defaults.settings.focusDuration, config.defaults.settings.shortBreak)
  );
  const TRACKS = config.audio.tracks;
  const CATEGORIES = config.audio.categories;

  // User settings used for the default timer preset
  const [userFocusDuration, setUserFocusDuration] = useState(config.defaults.settings.focusDuration);
  const [userBreakDuration, setUserBreakDuration] = useState(config.defaults.settings.shortBreak);
  const [longBreakDuration, setLongBreakDuration] = useState(config.defaults.settings.longBreak);
  const [longBreakInterval, setLongBreakInterval] = useState(config.defaults.settings.longBreakInterval);
  const [showAddPresetModal, setShowAddPresetModal] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<'add' | 'edit'>('add');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isPresetSectionCollapsed, setIsPresetSectionCollapsed] = useState(() => {
    try {
      return localStorage.getItem(TIMER_PRESET_SECTION_COLLAPSED_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });
  const [newPresetFocusMinutes, setNewPresetFocusMinutes] = useState(config.defaults.settings.focusDuration);
  const [newPresetBreakMinutes, setNewPresetBreakMinutes] = useState(config.defaults.settings.shortBreak);
  const [sessionCount, setSessionCount] = useState(() => {
    const saved = localStorage.getItem('tempo_sessionCount');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [tickingEnabled, setTickingEnabled] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(60);
  const tickIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound panel state
  const [soundFilter, setSoundFilter] = useState('All');
  const [showAllSounds, setShowAllSounds] = useState(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isStartingYouTube, setIsStartingYouTube] = useState(false);
  const [audioStatusHydrated, setAudioStatusHydrated] = useState(!useOffscreen);
  const hasHandledInitialAudioEffect = useRef(false);

  // Task Selector State
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);

  // Beat counter state - persisted to keep running when popup closes
  const [beatEnabled, setBeatEnabled] = useState(false);
  const [beatInterval, setBeatInterval] = useState(1); // 1, 2, or 3 seconds
  const [beatCount, setBeatCount] = useState(0);
  const [beatSoundType, setBeatSoundType] = useState('soft'); // soft, tick, wood, chime, drop, pulse, digital, bowl
  const beatIntervalRef = useRef<any>(null);
  const beatAudioCtxRef = useRef<AudioContext | null>(null);
  const stateInitializedRef = useRef(false); // Track if we've done initial load of both timer and beat state

  // Beat sound options - natural and calming sounds
  const beatSoundOptions = [
    { id: 'soft', name: 'Soft', icon: 'waves' },
    { id: 'tick', name: 'Tick', icon: 'timer' },
    { id: 'wood', name: 'Wood', icon: 'forest' },
    { id: 'chime', name: 'Bell', icon: 'notifications' },
    { id: 'drop', name: 'Water', icon: 'water_drop' },
    { id: 'pulse', name: 'Heart', icon: 'favorite' },
    { id: 'digital', name: 'Digital', icon: 'memory' },
    { id: 'bowl', name: 'Bowl', icon: 'self_improvement' },
  ];

  // Quick task state
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncingTask, setIsSyncingTask] = useState(false);

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

  // Quick task creation with Google Tasks sync
  const handleQuickTaskCreate = async () => {
    if (!quickTaskTitle.trim()) return;

    setIsSyncingTask(true);

    const newTask = {
      id: Date.now().toString(),
      title: quickTaskTitle.trim(),
      category: 'Work',
      priority: 'Medium' as const,
      completed: false,
      subtasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add to local tasks
    setTasks(prev => [newTask, ...prev]);
    setCurrentTask(newTask);
    setQuickTaskTitle('');

    // Sync with Google Tasks if connected
    if (isGoogleConnected) {
      try {
        await googleTasksService.createTask('@default', newTask.title);
      } catch (err) {
        console.error('Failed to sync task to Google:', err);
      }
    }

    setIsSyncingTask(false);
  };

  // Connect to Google Tasks
  const handleGoogleConnect = async () => {
    setIsSyncingTask(true);
    try {
      const success = await googleTasksService.authenticate();
      setIsGoogleConnected(success);
    } catch (err) {
      console.error('Google Tasks connection failed:', err);
    }
    setIsSyncingTask(false);
  };

  const handleAddTimerPreset = (focusInput?: number, breakInput?: number): boolean => {
    const focusMinutes = toPositiveInt(
      focusInput ?? userFocusDuration,
      config.defaults.settings.focusDuration,
      1
    );
    const breakMinutes = toPositiveInt(
      breakInput ?? userBreakDuration,
      config.defaults.settings.shortBreak,
      1
    );

    const existingPreset = templates.find(
      preset => preset.focusMinutes === focusMinutes && preset.breakMinutes === breakMinutes
    );

    const customPresetCount = templates.filter(preset => preset.id !== 'default').length;
    if (!existingPreset && customPresetCount >= MAX_CUSTOM_TIMER_PRESETS) {
      setPresetNotice(`You can add up to ${MAX_CUSTOM_TIMER_PRESETS} custom presets. Delete one to add another.`);
      return false;
    }

    const selectedId = existingPreset?.id || `preset-${Date.now()}`;
    const nextTemplates = existingPreset
      ? templates
      : [
          ...templates,
          {
            id: selectedId,
            label: `${focusMinutes}/${breakMinutes}`,
            description: 'Preset',
            focusMinutes,
            breakMinutes,
          },
        ];

    if (!existingPreset) {
      setTemplates(nextTemplates);
      saveTimerPresets(nextTemplates);
      setPresetNotice(`Added preset ${focusMinutes}/${breakMinutes}`);
    } else {
      setPresetNotice(`Preset ${focusMinutes}/${breakMinutes} already exists`);
    }

    if (isActive) {
      if (!existingPreset) {
        setPresetNotice(`Added preset ${focusMinutes}/${breakMinutes}. Pause timer to switch.`);
      }
      return true;
    }

    setActiveTemplateId(selectedId);
    localStorage.setItem(STORAGE_KEYS.TIMER_MODE, selectedId);

    if (!isActive) {
      const focusSeconds = focusMinutes * 60;
      setTimerMode('focus');
      setInitialTime(focusSeconds);
      setTimeLeft(focusSeconds);
      localStorage.setItem('tempo_timer_mode', 'focus');
      localStorage.setItem('tempo_timer_initialTime', String(focusSeconds));
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
      localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);
    }
    return true;
  };

  const handleOpenAddPresetModal = () => {
    const customPresetCount = templates.filter(preset => preset.id !== 'default').length;
    if (customPresetCount >= MAX_CUSTOM_TIMER_PRESETS) {
      setPresetNotice(`You can add up to ${MAX_CUSTOM_TIMER_PRESETS} custom presets. Delete one to add another.`);
      return;
    }
    setPresetModalMode('add');
    setEditingPresetId(null);
    setNewPresetFocusMinutes(toPositiveInt(userFocusDuration, config.defaults.settings.focusDuration, 1));
    setNewPresetBreakMinutes(toPositiveInt(userBreakDuration, config.defaults.settings.shortBreak, 1));
    setShowAddPresetModal(true);
  };

  const handleOpenEditPresetModal = (presetId: string) => {
    const preset = templates.find(t => t.id === presetId);
    if (!preset || preset.id === 'default') return;

    if (isActive && activeTemplateId === presetId) {
      setPresetNotice('Pause timer before editing active preset');
      return;
    }

    setPresetModalMode('edit');
    setEditingPresetId(presetId);
    setNewPresetFocusMinutes(preset.focusMinutes);
    setNewPresetBreakMinutes(preset.breakMinutes);
    setShowAddPresetModal(true);
  };

  const handleUpdateTimerPreset = (presetId: string, focusInput: number, breakInput: number): boolean => {
    const preset = templates.find(t => t.id === presetId);
    if (!preset || preset.id === 'default') return false;

    const focusMinutes = toPositiveInt(focusInput, preset.focusMinutes, 1);
    const breakMinutes = toPositiveInt(breakInput, preset.breakMinutes, 1);
    const duplicatePreset = templates.find(
      t => t.id !== presetId && t.focusMinutes === focusMinutes && t.breakMinutes === breakMinutes
    );

    if (duplicatePreset) {
      setPresetNotice(`Preset ${focusMinutes}/${breakMinutes} already exists`);
      return false;
    }

    const nextTemplates = templates.map(t => (
      t.id === presetId
        ? { ...t, focusMinutes, breakMinutes, label: `${focusMinutes}/${breakMinutes}` }
        : t
    ));

    setTemplates(nextTemplates);
    saveTimerPresets(nextTemplates);
    setPresetNotice(`Updated preset ${focusMinutes}/${breakMinutes}`);

    if (!isActive && activeTemplateId === presetId && timeLeft === initialTime) {
      const nextSeconds = timerMode === 'focus' ? focusMinutes * 60 : breakMinutes * 60;
      setInitialTime(nextSeconds);
      setTimeLeft(nextSeconds);
      localStorage.setItem('tempo_timer_initialTime', String(nextSeconds));
    }

    return true;
  };

  const handleClosePresetModal = () => {
    setShowAddPresetModal(false);
    setPresetModalMode('add');
    setEditingPresetId(null);
  };

  const togglePresetSectionVisibility = () => {
    setIsPresetSectionCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(TIMER_PRESET_SECTION_COLLAPSED_KEY, String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleConfirmAddPreset = () => {
    const focusMinutes = toPositiveInt(newPresetFocusMinutes, config.defaults.settings.focusDuration, 1);
    const breakMinutes = toPositiveInt(newPresetBreakMinutes, config.defaults.settings.shortBreak, 1);

    const succeeded = presetModalMode === 'edit' && editingPresetId
      ? handleUpdateTimerPreset(editingPresetId, focusMinutes, breakMinutes)
      : handleAddTimerPreset(focusMinutes, breakMinutes);

    if (succeeded) {
      handleClosePresetModal();
    }
  };

  const handleDeleteTimerPreset = (presetId: string) => {
    if (presetId === 'default') return;

    const presetToDelete = templates.find(preset => preset.id === presetId);
    if (!presetToDelete) return;

    if (isActive && activeTemplateId === presetId) {
      setPresetNotice('Pause timer before deleting active preset');
      return;
    }

    const nextTemplates = templates.filter(preset => preset.id !== presetId);
    const fallbackId = nextTemplates[0]?.id || 'default';
    const shouldSwitchActivePreset = activeTemplateId === presetId;
    const nextActivePresetId = shouldSwitchActivePreset ? fallbackId : activeTemplateId;

    setTemplates(nextTemplates);
    setActiveTemplateId(nextActivePresetId);
    saveTimerPresets(nextTemplates);
    localStorage.setItem(STORAGE_KEYS.TIMER_MODE, nextActivePresetId);
    setPresetNotice(`Deleted preset ${presetToDelete.label}`);

    if (!isActive && shouldSwitchActivePreset) {
      const focusSeconds = getTimeForTemplate(nextActivePresetId);
      setTimerMode('focus');
      setInitialTime(focusSeconds);
      setTimeLeft(focusSeconds);
      localStorage.setItem('tempo_timer_mode', 'focus');
      localStorage.setItem('tempo_timer_initialTime', String(focusSeconds));
    }
  };

  // Get initial time from a template
  const getTimeForTemplate = (templateId: string): number => {
    const tmpl = templates.find(t => t.id === templateId);
    return tmpl ? tmpl.focusMinutes * 60 : (templates[0]?.focusMinutes || config.defaults.settings.focusDuration) * 60;
  };

  const getBreakForTemplate = (templateId: string): number => {
    const tmpl = templates.find(t => t.id === templateId);
    return tmpl ? tmpl.breakMinutes * 60 : (templates[0]?.breakMinutes || config.defaults.settings.shortBreak) * 60;
  };

  // Restore template from localStorage if saved
  const savedTemplateId = localStorage.getItem(STORAGE_KEYS.TIMER_MODE);
  const restoredTemplateId = (savedTemplateId && templates.find(t => t.id === savedTemplateId)) ? savedTemplateId : (templates[0]?.id || 'default');

  const [activeTemplateId, setActiveTemplateId] = useState(restoredTemplateId);
  const [timeLeft, setTimeLeft] = useState(getTimeForTemplate(restoredTemplateId));
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(getTimeForTemplate(restoredTemplateId));
  // Restore timer mode (focus/break) from localStorage
  const savedTimerMode = localStorage.getItem('tempo_timer_mode') as 'focus' | 'break' | null;
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>(savedTimerMode === 'break' ? 'break' : 'focus');
  // Track whether initial timer state has been loaded (prevents template change from clobbering active timer)
  const timerRestoredRef = useRef(false);

  // Load user settings for ticking and restore focus beat state
  useEffect(() => {
    const loadUserSettings = async () => {
      const settings = await getSettings();
      setUserFocusDuration(settings.focusDuration);
      setUserBreakDuration(settings.shortBreak);
      setLongBreakDuration(settings.longBreak);
      setLongBreakInterval(settings.longBreakInterval || config.defaults.settings.longBreakInterval);
      setTickingEnabled(settings.tickingEnabled);
      setTickSpeed(settings.tickingSpeed);

      // Keep one default timer preset synced with Timer settings.
      setTemplates(prev => {
        const defaultPreset = createDefaultPreset(settings.focusDuration, settings.shortBreak);
        const customPresets = prev.filter(preset => preset.id !== 'default');
        const next = [defaultPreset, ...customPresets];
        saveTimerPresets(next);
        return next;
      });

      // Restore focus beat state from localStorage
      const savedBeatEnabled = localStorage.getItem('tempo_beatEnabled') === 'true';
      const savedBeatInterval = parseInt(localStorage.getItem('tempo_beatInterval') || '1', 10);
      const savedBeatSoundType = localStorage.getItem('tempo_beatSoundType') || 'soft';
      setBeatEnabled(savedBeatEnabled);
      setBeatInterval(savedBeatInterval);
      setBeatSoundType(savedBeatSoundType);

      // If beat was enabled, check with offscreen for current count
      if (savedBeatEnabled) {
        const w = window as any;
        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage({ action: 'focusBeat-status' }, (response: any) => {
            if (response?.count !== undefined) {
              setBeatCount(response.count);
            }
          });
        }
      }

      // Sync session count from chrome.storage.local (background may have updated it)
      const w = window as any;
      if (w.chrome?.storage?.local) {
        try {
          w.chrome.storage.local.get(['sessionCount'], (data: any) => {
            if (data.sessionCount !== undefined) {
              setSessionCount(data.sessionCount);
              localStorage.setItem('tempo_sessionCount', String(data.sessionCount));
            }
          });
        } catch (e) { }
      }

      // Check Google Tasks connection
      setIsGoogleConnected(googleTasksService.isConnected());

      // Mark state as fully initialized after settings are loaded
      stateInitializedRef.current = true;
    };
    loadUserSettings();
  }, []);

  // Ensure current template id is always valid as templates change.
  useEffect(() => {
    if (!templates.length) return;

    if (!templates.some(template => template.id === activeTemplateId)) {
      const fallbackId = templates[0].id;
      setActiveTemplateId(fallbackId);
      localStorage.setItem(STORAGE_KEYS.TIMER_MODE, fallbackId);
      return;
    }

    localStorage.setItem(STORAGE_KEYS.TIMER_MODE, activeTemplateId);
  }, [templates, activeTemplateId]);

  // If timer presets change while idle, refresh displayed duration for the selected preset.
  useEffect(() => {
    if (!templates.length || isActive) return;
    if (localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true') return;
    if (timeLeft !== initialTime) return; // Preserve paused/in-progress value

    const nextSeconds = timerMode === 'focus'
      ? getTimeForTemplate(activeTemplateId)
      : getBreakForTemplate(activeTemplateId);

    if (nextSeconds !== initialTime) {
      setInitialTime(nextSeconds);
      setTimeLeft(nextSeconds);
      localStorage.setItem('tempo_timer_initialTime', String(nextSeconds));
    }
  }, [templates, activeTemplateId, timerMode, isActive, timeLeft, initialTime]);

  useEffect(() => {
    if (!presetNotice) return;
    const timeout = setTimeout(() => setPresetNotice(null), 2500);
    return () => clearTimeout(timeout);
  }, [presetNotice]);

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

  // Persist beat settings when they change (only after initial load)
  useEffect(() => {
    if (!stateInitializedRef.current) return;
    localStorage.setItem('tempo_beatEnabled', String(beatEnabled));
    localStorage.setItem('tempo_beatInterval', String(beatInterval));
    localStorage.setItem('tempo_beatSoundType', beatSoundType);
  }, [beatEnabled, beatInterval, beatSoundType]);

  // On mount: sync with offscreen beat state and start polling for count
  useEffect(() => {
    const w = window as any;
    if (!useOffscreen || !w.chrome?.runtime?.sendMessage) return;

    // Check current offscreen beat status after a small delay to let offscreen restore
    const initialCheck = setTimeout(() => {
      w.chrome.runtime.sendMessage({ action: 'focusBeat-status' }, (response: any) => {
        if (response?.enabled) {
          // Beat is running in offscreen, sync UI
          setBeatEnabled(true);
          if (response.count !== undefined) {
            setBeatCount(response.count);
          }
          localStorage.setItem('tempo_beatEnabled', 'true');
          if (response.intervalMs) {
            const intervalSec = Math.round(response.intervalMs / 1000);
            setBeatInterval(intervalSec);
            localStorage.setItem('tempo_beatInterval', String(intervalSec));
          }
          if (response.soundType) {
            setBeatSoundType(response.soundType);
            localStorage.setItem('tempo_beatSoundType', response.soundType);
          }
        } else {
          // Offscreen says beat is not running - check if we should restart it
          const savedBeatEnabled = localStorage.getItem('tempo_beatEnabled') === 'true';
          const savedTimerActive = localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true';
          if (savedBeatEnabled && savedTimerActive) {
            // Beat was enabled and timer was running, but offscreen lost state - restart
            const savedInterval = parseInt(localStorage.getItem('tempo_beatInterval') || '1', 10);
            const savedSoundType = localStorage.getItem('tempo_beatSoundType') || 'soft';
            w.chrome.runtime.sendMessage({
              action: 'focusBeat-start',
              intervalSeconds: savedInterval,
              soundType: savedSoundType
            });
            console.log('[Tempo] Restarted focus beat from UI persistence');
          }
        }
      });
    }, 200);

    // Poll for beat count updates while popup is open
    const pollInterval = setInterval(() => {
      w.chrome.runtime.sendMessage({ action: 'focusBeat-status' }, (response: any) => {
        if (response?.enabled && response?.count !== undefined) {
          setBeatCount(response.count);
        }
      });
    }, 500);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(pollInterval);
    };
  }, []);

  // Handle user toggling beat on/off
  const handleBeatToggle = () => {
    const w = window as any;
    const newEnabled = !beatEnabled;
    setBeatEnabled(newEnabled);

    if (useOffscreen && w.chrome?.runtime?.sendMessage) {
      if (newEnabled) {
        // Start beat immediately if timer is running
        if (isActive) {
          // Only reset count when user explicitly starts a new beat session
          setBeatCount(0);
          w.chrome.runtime.sendMessage({
            action: 'focusBeat-start',
            intervalSeconds: beatInterval,
            soundType: beatSoundType
          }, (response: any) => {
            // After starting, get the actual count (in case it was already running)
            if (response?.count !== undefined) {
              setBeatCount(response.count);
            }
          });
        }
      } else {
        // Stop beat (user disabled beat)
        w.chrome.runtime.sendMessage({ action: 'focusBeat-stop' });
        setBeatCount(0);
      }
    }
  };

  // Handle beat sound type change
  const handleBeatSoundTypeChange = (newSoundType: string) => {
    setBeatSoundType(newSoundType);
    const w = window as any;
    if (useOffscreen && w.chrome?.runtime?.sendMessage) {
      // If beat is currently running, update the sound type
      if (beatEnabled && isActive) {
        w.chrome.runtime.sendMessage({
          action: 'focusBeat-changeSoundType',
          soundType: newSoundType
        });
      }
    }
  };

  // Handle beat interval change
  const handleBeatIntervalChange = (newInterval: number) => {
    setBeatInterval(newInterval);
    const w = window as any;
    if (beatEnabled && isActive && useOffscreen && w.chrome?.runtime?.sendMessage) {
      // Restart with new interval
      w.chrome.runtime.sendMessage({
        action: 'focusBeat-start',
        intervalSeconds: newInterval,
        soundType: beatSoundType
      });
    }
  };

  // Start/stop beat when timer starts/stops (only if beat is enabled)
  useEffect(() => {
    if (!stateInitializedRef.current) return;

    const w = window as any;
    // Only handle LOCAL fallback here. Extension logic is handled in event handlers.
    if (!useOffscreen || !w.chrome?.runtime?.sendMessage) {
      if (isActive && beatEnabled) {
        const playBeat = () => {
          setBeatCount(prev => prev + 1);
          try {
            if (!beatAudioCtxRef.current || beatAudioCtxRef.current.state === 'closed') {
              beatAudioCtxRef.current = new AudioContext();
            }
            const ctx = beatAudioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();
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
          } catch (e) { }
        };
        playBeat();
        beatIntervalRef.current = setInterval(playBeat, beatInterval * 1000);
      } else {
        if (beatIntervalRef.current) {
          clearInterval(beatIntervalRef.current);
          beatIntervalRef.current = null;
        }
        setBeatCount(0);
      }
      return () => {
        if (beatIntervalRef.current) {
          clearInterval(beatIntervalRef.current);
          beatIntervalRef.current = null;
        }
      };
    }
  }, [isActive, beatEnabled]);

  // Update timer when template changes — but skip on first mount if we're restoring a timer
  const templateChangeCountRef = useRef(0);
  useEffect(() => {
    templateChangeCountRef.current++;
    // Skip the first render — the loadTimerState effect handles restoring saved state
    if (templateChangeCountRef.current <= 1) return;
    setIsActive(false);
    timerRestoredRef.current = false;
    setTimerMode('focus'); // Reset to focus mode when template changes
    const newTime = getTimeForTemplate(activeTemplateId);
    setInitialTime(newTime);
    setTimeLeft(newTime);
    localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
    localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);
    localStorage.setItem('tempo_timer_mode', 'focus');
    localStorage.removeItem('tempo_timer_initialTime');
  }, [activeTemplateId]);

  // Load timer state on mount
  useEffect(() => {
    const loadTimerState = async () => {
      const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
      const savedTemplateId = localStorage.getItem(STORAGE_KEYS.TIMER_MODE);
      const savedIsActive = localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true';
      const savedTimerModeVal = localStorage.getItem('tempo_timer_mode') as 'focus' | 'break' | null;
      const savedInitialTime = localStorage.getItem('tempo_timer_initialTime');

      // Also check chrome.storage.local for timer started from alarm page
      const w = window as any;
      let chromeStorageState: any = null;
      if (w.chrome?.storage?.local) {
        try {
          chromeStorageState = await new Promise((resolve) => {
            w.chrome.storage.local.get(['timerTargetTime', 'timerMode', 'timerInitialTime', 'timerIsActive'], resolve);
          });
        } catch (e) {
          console.log('[Tempo] Could not read chrome storage:', e);
        }
      }

      // Check if background script has a running timer (from alarm page "Start Break")
      if (chromeStorageState?.timerTargetTime && chromeStorageState?.timerIsActive) {
        const targetTime = chromeStorageState.timerTargetTime;
        const now = Date.now();
        const diff = Math.ceil((targetTime - now) / 1000);

        if (diff > 0) {
          // Sync with background script timer
          const mode = chromeStorageState.timerMode || 'focus';
          const initialSeconds = chromeStorageState.timerInitialTime || diff;

          setTimerMode(mode);
          setInitialTime(initialSeconds);
          setTimeLeft(diff);
          setIsActive(true);
          timerRestoredRef.current = true;

          // Sync localStorage with chrome storage
          localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(targetTime));
          localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, 'true');
          localStorage.setItem('tempo_timer_mode', mode);
          localStorage.setItem('tempo_timer_initialTime', String(initialSeconds));

          // Clear the sync flag so we don't re-read it
          w.chrome.storage.local.remove(['timerIsActive']);
          return;
        } else {
          // Timer already expired, clean up
          w.chrome.storage.local.remove(['timerTargetTime', 'timerMode', 'timerInitialTime', 'timerIsActive']);
        }
      }

      // Fall back to localStorage state
      if (savedTemplateId && templates.find(t => t.id === savedTemplateId)) {
        // Don't call setActiveTemplateId if it's the same — avoids triggering the reset effect
        if (savedTemplateId !== activeTemplateId) {
          setActiveTemplateId(savedTemplateId);
        }
      }

      if (savedIsActive && savedTarget) {
        const targetTime = parseInt(savedTarget, 10);
        const now = Date.now();
        const diff = Math.ceil((targetTime - now) / 1000);

        if (diff > 0) {
          // Restore timer mode and initial time
          if (savedTimerModeVal) {
            setTimerMode(savedTimerModeVal);
          }
          if (savedInitialTime) {
            setInitialTime(parseInt(savedInitialTime, 10));
          }
          setTimeLeft(diff);
          setIsActive(true);
          timerRestoredRef.current = true;

          // Notify background that timer is running (in case it forgot/reloaded)
          // Mark as restore so background doesn't overwrite timerDuration with remaining time
          try {
            if (w.chrome?.runtime?.sendMessage) {
              w.chrome.runtime.sendMessage({ action: 'startTimer', seconds: diff, mode: savedTimerModeVal || 'focus', isRestore: true });
            }
          } catch (e) { }

        } else {
          // Timer expired while popup was closed — show the next ready state (not 0:00)
          setIsActive(false);
          localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
          localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);

          // If we were in focus, the background already handled completion,
          // so show the break-ready state. If we were in break, show focus-ready.
          if (savedTimerModeVal === 'focus') {
            const breakTime = getBreakForTemplate(activeTemplateId);
            setTimerMode('break');
            setInitialTime(breakTime);
            setTimeLeft(breakTime);
            localStorage.setItem('tempo_timer_mode', 'break');
            localStorage.setItem('tempo_timer_initialTime', String(breakTime));
          } else if (savedTimerModeVal === 'break') {
            const focusTime = getTimeForTemplate(activeTemplateId);
            setTimerMode('focus');
            setInitialTime(focusTime);
            setTimeLeft(focusTime);
            localStorage.setItem('tempo_timer_mode', 'focus');
            localStorage.setItem('tempo_timer_initialTime', String(focusTime));
          } else {
            // Unknown mode — default to focus
            const focusTime = getTimeForTemplate(activeTemplateId);
            setTimerMode('focus');
            setInitialTime(focusTime);
            setTimeLeft(focusTime);
          }
        }
      }
    };

    loadTimerState();

    // Listen for timer started from alarm page while popup is open
    const w = window as any;
    if (w.chrome?.storage?.onChanged) {
      const handleStorageChange = (changes: any, areaName: string) => {
        if (areaName === 'local' && changes.timerIsActive?.newValue === true) {
          // Timer was started from alarm page - reload state
          console.log('[Tempo] Timer started from alarm, syncing...');
          loadTimerState();
        }
      };
      w.chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        w.chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  // Persist timer mode and initial time for mini timer and popup restore
  useEffect(() => {
    localStorage.setItem('tempo_timer_mode', timerMode);
    localStorage.setItem('tempo_timer_initialTime', String(initialTime));
  }, [timerMode, initialTime]);

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

      if (timerMode === 'focus') {
        // Focus session completed - stats are recorded by background.js (single source of truth)
        // to avoid race conditions and double-counting

        // ALWAYS stop focus sounds when session completes (not just if autoPlay)
        if (audioState.isPlaying) {
          if (useOffscreen) {
            stopOffscreen();
          } else {
            stopSound();
          }
          setAudioState(prev => ({ ...prev, isPlaying: false, activeTrackId: null }));
        }

        // Show in-app completion notification
        setShowCompletionNotification(true);

        // Send Chrome notification via background service worker & clear badge
        try {
          const w = window as any;
          if (w.chrome?.runtime?.sendMessage) {
            // FIRST stop focus beat before sending timerComplete (to avoid extra beat sounds)
            if (beatEnabled) {
              w.chrome.runtime.sendMessage({ action: 'focusBeat-stop' });
              setBeatEnabled(false); // Also disable the beat toggle
              setBeatCount(0);
              localStorage.setItem('tempo_beatEnabled', 'false');
            }
            // Then send timer complete which opens the alarm page
            w.chrome.runtime.sendMessage({
              action: 'timerComplete',
              mode: 'focus',
              duration: Math.round(initialTime / 60),
              templateBreakMinutes: Math.round(getBreakForTemplate(activeTemplateId) / 60),
              templateFocusMinutes: Math.round(getTimeForTemplate(activeTemplateId) / 60)
            });
            w.chrome.runtime.sendMessage({ action: 'stopTimer' });
          }
        } catch (e) {
          // Not in extension context
        }

        // Also use Notification API as fallback for non-extension context
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus Session Complete!', {
            body: 'Great work! Time for a break.',
            icon: '/icons/icon128_v4.png',
          });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }

        // Session count is incremented by background.js (single source of truth)
        // Read break info computed by background after a short delay to allow async processing
        const setupBreakTimer = () => {
          const w = window as any;
          if (w.chrome?.storage?.local) {
            w.chrome.storage.local.get(['sessionCount', 'nextBreakDuration', 'nextBreakIsLong'], (data: any) => {
              const newCount = data.sessionCount || sessionCount + 1;
              setSessionCount(newCount);
              localStorage.setItem('tempo_sessionCount', String(newCount));

              // Use break duration from background if available, otherwise compute locally
              let breakTime: number;
              if (data.nextBreakDuration) {
                breakTime = data.nextBreakDuration * 60;
                console.log('[Tempo] Using break duration from background:', data.nextBreakDuration, 'min, isLong:', data.nextBreakIsLong);
                // Clean up the one-time break info
                w.chrome.storage.local.remove(['nextBreakDuration', 'nextBreakIsLong']);
              } else {
                // Fallback: compute locally
                const isLongBreak = longBreakInterval > 0 && newCount % longBreakInterval === 0;
                breakTime = isLongBreak ? longBreakDuration * 60 : getBreakForTemplate(activeTemplateId);
                console.log('[Tempo] Using locally computed break:', breakTime / 60, 'min, isLong:', isLongBreak);
              }

              setTimerMode('break');
              setInitialTime(breakTime);
              setTimeLeft(breakTime);
              localStorage.setItem('tempo_timer_mode', 'break');
              localStorage.setItem('tempo_timer_initialTime', String(breakTime));
            });
          } else {
            // Non-extension fallback
            const newSessionCount = sessionCount + 1;
            setSessionCount(newSessionCount);
            localStorage.setItem('tempo_sessionCount', String(newSessionCount));
            const isLongBreak = longBreakInterval > 0 && newSessionCount % longBreakInterval === 0;
            const breakTime = isLongBreak ? longBreakDuration * 60 : getBreakForTemplate(activeTemplateId);
            setTimerMode('break');
            setInitialTime(breakTime);
            setTimeLeft(breakTime);
            localStorage.setItem('tempo_timer_mode', 'break');
            localStorage.setItem('tempo_timer_initialTime', String(breakTime));
          }
        };

        // Small delay to let background.js process timerComplete first
        setTimeout(setupBreakTimer, 300);
      } else {
        // Break completed - transition back to focus mode
        setShowCompletionNotification(true);

        // Notify user break is done - opens alarm page
        try {
          const w = window as any;
          if (w.chrome?.runtime?.sendMessage) {
            w.chrome.runtime.sendMessage({
              action: 'timerComplete',
              mode: 'break',
              duration: Math.round(initialTime / 60)
            });
            w.chrome.runtime.sendMessage({ action: 'stopTimer' });
          }
        } catch (e) { }

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Break Complete!', {
            body: 'Ready for another focus session?',
            icon: '/icons/icon128_v4.png',
          });
        }

        // Set up next focus session
        const focusTime = getTimeForTemplate(activeTemplateId);
        setTimerMode('focus');
        setInitialTime(focusTime);
        setTimeLeft(focusTime);
        // Persist so popup reopen shows focus ready (not 0:00)
        localStorage.setItem('tempo_timer_mode', 'focus');
        localStorage.setItem('tempo_timer_initialTime', String(focusTime));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, String(newActive));
    localStorage.setItem(STORAGE_KEYS.TIMER_MODE, activeTemplateId);
    // Persist timerMode and initialTime so they survive popup close/reopen
    localStorage.setItem('tempo_timer_mode', timerMode);
    localStorage.setItem('tempo_timer_initialTime', String(initialTime));

    const w = window as any;
    const isExtension = useOffscreen && w.chrome?.runtime?.sendMessage;

    if (newActive) {
      const target = Date.now() + (timeLeft * 1000);
      localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));

      // Update extension badge with timer
      try {
        if (w.chrome?.runtime?.sendMessage) {
          // If timeLeft < initialTime, this is a resume after pause - don't overwrite the original duration
          const isPauseResume = timeLeft < initialTime;
          w.chrome.runtime.sendMessage({ action: 'startTimer', seconds: timeLeft, mode: timerMode, isRestore: isPauseResume });
        }
      } catch (e) { }

      // Start Focus Beat if enabled
      if (beatEnabled && isExtension) {
        setBeatCount(0);
        w.chrome.runtime.sendMessage({
          action: 'focusBeat-start',
          intervalSeconds: beatInterval,
          soundType: beatSoundType
        });
      }

    } else {
      localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);

      // Clear extension badge
      try {
        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage({ action: 'stopTimer' });
        }
      } catch (e) { }

      // Stop Focus Beat if enabled
      if (beatEnabled && isExtension) {
        w.chrome.runtime.sendMessage({ action: 'focusBeat-stop' });
        setBeatCount(0);
      }
    }
  };

  // On mount, check if offscreen audio is already playing (persisted from previous popup open)
  useEffect(() => {
    let cancelled = false;

    const syncOffscreenAudioState = async () => {
      if (!useOffscreen) {
        setAudioStatusHydrated(true);
        return;
      }

      try {
        const [builtInStatus, youtubeStatus] = await Promise.all([
          getOffscreenStatus(),
          getYouTubeOffscreenStatus(),
        ]);

        if (cancelled) return;

        if (youtubeStatus.error) {
          setYoutubeError(youtubeStatus.error);
        }

        if (youtubeStatus.isPlaying && youtubeStatus.videoId) {
          setAudioState(prev => ({
            ...prev,
            isPlaying: true,
            activeTrackId: null,
            youtubeId: youtubeStatus.videoId,
          }));
        } else if (builtInStatus.isPlaying && builtInStatus.trackId) {
          setAudioState(prev => ({
            ...prev,
            isPlaying: true,
            activeTrackId: builtInStatus.trackId,
            youtubeId: null,
          }));
        }
      } catch (e) {
        console.error('[Tempo] Failed to sync offscreen audio state:', e);
      } finally {
        if (!cancelled) {
          setAudioStatusHydrated(true);
        }
      }
    };

    syncOffscreenAudioState();
    return () => {
      cancelled = true;
    };
  }, [setAudioState]);

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
      return;
    }

    if (audioState.isPlaying && audioState.youtubeId && !audioState.activeTrackId && useOffscreen) {
      setYouTubeOffscreenVolume(audioState.volume / 100);
    }
  }, [audioState.volume, audioState.trackSettings, audioState.activeTrackId, audioState.youtubeId, audioState.isPlaying]);

  // Stop sound when audioState says not playing
  useEffect(() => {
    if (!audioStatusHydrated) return;

    if (!hasHandledInitialAudioEffect.current) {
      hasHandledInitialAudioEffect.current = true;
      return;
    }

    if (!audioState.isPlaying) {
      if (useOffscreen) {
        stopOffscreen();
        stopYouTubeOffscreen();
      } else {
        stopSound();
      }
    }
  }, [audioState.isPlaying, audioStatusHydrated]);

  // Handle toggling a track
  const handleToggleTrack = async (track: AudioTrackConfig) => {
    setAudioError(null);
    const isCurrent = audioState.activeTrackId === track.id && audioState.isPlaying;
    if (isCurrent) {
      if (useOffscreen) {
        await stopOffscreen();
        await stopYouTubeOffscreen();
      } else {
        stopSound();
      }
      setAudioState(prev => ({ ...prev, isPlaying: false, activeTrackId: null }));
    } else {
      if (useOffscreen) {
        await stopOffscreen();
        await stopYouTubeOffscreen();
      } else {
        stopSound();
      }
      let started = false;
      if (isBuiltInTrack(track.id)) {
        const vol = (audioState.trackSettings[track.id]?.volume ?? 50) / 100 * (audioState.volume / 100);
        if (useOffscreen) {
          started = await playOffscreen(track.id, Math.max(0.01, vol));
        } else {
          await playSound(track.id, Math.max(0.01, vol));
          started = true;
        }
      }

      if (!started) {
        setAudioError(`Could not start "${track.name}".`);
        setAudioState(prev => ({
          ...prev,
          isPlaying: false,
          activeTrackId: null,
          youtubeId: null,
        }));
        return;
      }

      setAudioState(prev => ({
        ...prev,
        isPlaying: true,
        activeTrackId: track.id,
        youtubeId: null,
      }));
    }
  };

  const handleYoutubePlay = async () => {
    setYoutubeError(null);
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      setYoutubeError('Please enter a valid YouTube link.');
      return;
    }

    if (!useOffscreen) {
      setYoutubeError('YouTube streaming is available in the Chrome extension build.');
      return;
    }

    setIsStartingYouTube(true);
    try {
      // Stop any currently playing sound first
      await stopOffscreen();
      await stopYouTubeOffscreen();

      const result = await playYouTubeOffscreen(videoId);
      if (!result.success) {
        setYoutubeError(result.error || 'Failed to start YouTube stream.');
        setAudioState(prev => ({
          ...prev,
          isPlaying: false,
          activeTrackId: null,
          youtubeId: null,
        }));
        return;
      }

      setAudioState(prev => ({
        ...prev,
        isPlaying: true,
        activeTrackId: null,
        youtubeId: videoId,
      }));
      setAudioError(null);
      setYoutubeUrl('');
    } finally {
      setIsStartingYouTube(false);
    }
  };

  const isYouTubeStreamActive = audioState.isPlaying && !!audioState.youtubeId && !audioState.activeTrackId;

  const handleYoutubeToggle = async () => {
    if (isYouTubeStreamActive) {
      if (useOffscreen) {
        await stopYouTubeOffscreen();
      }
      setAudioState(prev => ({ ...prev, isPlaying: false, youtubeId: null }));
      setYoutubeError(null);
      return;
    }
    await handleYoutubePlay();
  };

  const builtInTracks = TRACKS.filter(t => isBuiltInTrack(t.id));
  const desiredSoundFilterOrder = ['All', 'Binaural', 'Ambience', 'Solfeggio', 'Noise', 'Music'];
  const availableSoundCategories = new Set(builtInTracks.map(track => track.category));
  const soundFilterOptions = desiredSoundFilterOrder.filter(
    option => option === 'All' || availableSoundCategories.has(option)
  );

  const filteredTracks = soundFilter === 'All'
    ? builtInTracks
    : builtInTracks.filter(track => track.category === soundFilter);
  const customPresetCount = templates.filter(preset => preset.id !== 'default').length;
  const hasReachedCustomPresetLimit = customPresetCount >= MAX_CUSTOM_TIMER_PRESETS;
  const activePresetLabel = templates.find(t => t.id === activeTemplateId)?.label || `${userFocusDuration}/${userBreakDuration}`;

  const showSeparatedBinauralSection = soundFilter === 'All';
  const binauralTracks = filteredTracks.filter(track => track.category === 'Binaural');
  const ambientAndToneTracks = filteredTracks.filter(track => track.category !== 'Binaural');

  const visibleBinauralTracks = showSeparatedBinauralSection
    ? (showAllSounds ? binauralTracks : binauralTracks.slice(0, 4))
    : [];
  const visibleAmbientAndToneTracks = showSeparatedBinauralSection
    ? (showAllSounds ? ambientAndToneTracks : ambientAndToneTracks.slice(0, 4))
    : [];
  const displayTracks = showSeparatedBinauralSection
    ? []
    : (showAllSounds ? filteredTracks : filteredTracks.slice(0, 6));
  const collapsedTrackCount = showSeparatedBinauralSection
    ? Math.min(4, binauralTracks.length) + Math.min(4, ambientAndToneTracks.length)
    : Math.min(6, filteredTracks.length);
  const canToggleShowAllTracks = filteredTracks.length > collapsedTrackCount;

  const renderSoundCard = (track: AudioTrackConfig) => {
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
            <p className="text-[9px] text-muted">
              {track.category}{REAL_RECORDING_TRACK_IDS.has(track.id) ? ' - Real recording' : ''}
            </p>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col px-5 pt-2 pb-28 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <img src="./icons/icon16_v4.png" alt="" className="w-4 h-4" />
            <h1 className="text-base font-bold tracking-tight leading-tight">Tempo Focus</h1>
          </div>
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
            {(templates.find(t => t.id === activeTemplateId)?.label || `${userFocusDuration}/${userBreakDuration}`) + ' Timer'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mini Floating Timer Button */}
          <button
            onClick={() => {
              try {
                const w = window as any;
                // Position in top-right corner of screen
                const top = 30;
                const left = screen.availWidth - 220;

                if (w.chrome?.windows?.create) {
                  w.chrome.windows.create({
                    url: w.chrome.runtime.getURL('mini-timer.html'),
                    type: 'popup',
                    width: 220,
                    height: 56,
                    top: top,
                    left: left,
                    focused: true
                  });
                } else {
                  window.open(
                    (w.chrome?.runtime?.getURL?.('mini-timer.html')) || 'mini-timer.html',
                    'TempoMini',
                    `width=200,height=70,top=${top},left=${left},toolbar=no,menubar=no,location=no,status=no,resizable=no`
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

      {/* Preset Controls */}
      {isPresetSectionCollapsed ? (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Preset Controls Hidden</p>
            <p className="text-[10px] font-semibold text-white/80 truncate">{activePresetLabel} active</p>
          </div>
          <button
            onClick={togglePresetSectionVisibility}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Show timer presets and controls"
          >
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg mb-2 border border-white/5 bg-surface-dark p-0.5">
            <div className="flex items-center gap-1">
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <div className="flex min-w-max gap-1">
                  {templates.map((tmpl) => {
                    const isCurrentTemplate = activeTemplateId === tmpl.id;
                    const isDisabled = (isActive || timerMode === 'break') && !isCurrentTemplate;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => {
                          if (!isDisabled) setActiveTemplateId(tmpl.id);
                        }}
                        disabled={isDisabled}
                        title={`${tmpl.label} (${tmpl.focusMinutes}/${tmpl.breakMinutes})`}
                        className={`shrink-0 min-w-[78px] px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${isCurrentTemplate ? 'bg-primary text-white shadow-md shadow-primary/25' : isDisabled ? 'text-muted/40 cursor-not-allowed' : 'text-muted hover:text-white/70'}`}
                      >
                        {tmpl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={togglePresetSectionVisibility}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Hide timer presets and controls"
              >
                <span className="material-symbols-outlined text-[16px]">expand_less</span>
              </button>
            </div>
          </div>

      <div className="w-full mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-white/85">
              Default timer: {userFocusDuration} / {userBreakDuration} min
            </p>
            <p className="text-[9px] text-muted">
              One default timer is always available. Add and remove extra presets anytime.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddPresetModal}
              disabled={hasReachedCustomPresetLimit}
              className={`h-8 px-2.5 rounded-md border transition-colors flex items-center gap-1 ${
                hasReachedCustomPresetLimit
                  ? 'border-white/10 bg-white/5 text-muted/40 cursor-not-allowed'
                  : 'border-primary/30 bg-primary/15 text-primary hover:bg-primary/20'
              }`}
              title={
                hasReachedCustomPresetLimit
                  ? `Maximum ${MAX_CUSTOM_TIMER_PRESETS} custom presets reached`
                  : 'Add a new timer preset'
              }
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
            </button>
            <button
              onClick={() => setScreen(Screen.SETTINGS)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
              title="Edit default timer values"
            >
              <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {templates.map((preset) => {
            const isPresetActive = activeTemplateId === preset.id;
            const isDefaultPreset = preset.id === 'default';
            const deleteDisabled = (isActive && isPresetActive);
            return (
              <div
                key={preset.id}
                className={`shrink-0 flex items-center rounded-full border ${
                  isPresetActive ? 'border-primary/40 bg-primary/20' : 'border-white/10 bg-black/20'
                }`}
              >
                <button
                  onClick={() => {
                    if (!isPresetActive && !(isActive || timerMode === 'break')) {
                      setActiveTemplateId(preset.id);
                    }
                  }}
                  className={`px-2.5 py-1 text-[10px] font-semibold ${
                    isPresetActive ? 'text-white' : 'text-muted hover:text-white/80'
                  }`}
                  title={`${preset.label} preset`}
                >
                  {isDefaultPreset ? `Default ${preset.label}` : preset.label}
                </button>
                {!isDefaultPreset && (
                  <button
                    onClick={() => handleOpenEditPresetModal(preset.id)}
                    disabled={deleteDisabled}
                    className={`mr-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                      deleteDisabled
                        ? 'text-muted/40 cursor-not-allowed'
                        : 'text-muted hover:text-white hover:bg-white/10'
                    }`}
                    title={deleteDisabled ? 'Pause timer before editing active preset' : `Edit ${preset.label}`}
                  >
                    <span className="material-symbols-outlined text-[11px]">edit</span>
                  </button>
                )}
                {!isDefaultPreset && (
                  <button
                    onClick={() => handleDeleteTimerPreset(preset.id)}
                    disabled={deleteDisabled}
                    className={`mr-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                      deleteDisabled
                        ? 'text-muted/40 cursor-not-allowed'
                        : 'text-muted hover:text-red-300 hover:bg-red-500/20'
                    }`}
                    title={deleteDisabled ? 'Pause timer before deleting active preset' : `Delete ${preset.label}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {presetNotice && (
          <p className="mt-1.5 text-[9px] font-semibold text-primary">{presetNotice}</p>
        )}
        <p className="mt-1 text-[9px] text-muted">
          Custom presets: {customPresetCount}/{MAX_CUSTOM_TIMER_PRESETS}
        </p>
      </div>
        </>
      )}

      {showAddPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
          <div className="w-full max-w-xs rounded-xl border border-white/10 bg-surface-dark p-4">
            <p className="text-sm font-bold text-white">
              {presetModalMode === 'edit' ? 'Edit Timer Preset' : 'Add Timer Preset'}
            </p>
            <p className="text-[10px] text-muted mt-1">
              {presetModalMode === 'edit' ? 'Update focus/break values for this preset.' : 'Create a new focus/break preset.'}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="text-[10px] font-semibold text-white/80">Focus (min)</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={newPresetFocusMinutes}
                  onChange={(e) => setNewPresetFocusMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary/40"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-white/80">Break (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newPresetBreakMinutes}
                  onChange={(e) => setNewPresetBreakMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary/40"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={handleClosePresetModal}
                className="h-8 px-3 rounded-md border border-white/10 text-[10px] font-semibold text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddPreset}
                className="h-8 px-3 rounded-md border border-primary/30 bg-primary/15 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                {presetModalMode === 'edit' ? 'Save Changes' : 'Add Preset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Circle */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative flex items-center justify-center w-52 h-52 mb-4">
          <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
            <circle className="stroke-surface-light" cx="50" cy="50" fill="transparent" r="44" strokeWidth="4" />
            <circle
              className={`transition-all duration-1000 ease-linear ${timerMode === 'focus' ? 'stroke-primary' : 'stroke-green-500'}`}
              cx="50" cy="50"
              fill="transparent" r="44"
              strokeWidth="4"
              strokeDasharray="276.5"
              strokeDashoffset={276.5 - ((initialTime - timeLeft) / initialTime) * 276.5}
              strokeLinecap="round"
              style={{ filter: isActive ? `drop-shadow(0 0 12px ${timerMode === 'focus' ? 'var(--color-primary)' : '#22C55E'})` : 'none' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-black tracking-tight tabular-nums leading-none">{formatTimer(timeLeft)}</span>
            <span className="text-[10px] font-bold text-muted mt-1.5 uppercase tracking-[0.2em]">
              {isActive
                ? (timerMode === 'focus' ? 'Focusing' : 'On Break')
                : (timerMode === 'focus' ? 'Ready' : 'Break Ready')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTimer}
            className={`px-8 py-2 rounded-full font-bold text-sm tracking-wide flex items-center gap-2 transition-all active:scale-95 ${isActive
              ? 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
              : 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'
              }`}
          >
            <span className="material-symbols-outlined text-lg">{isActive ? 'pause' : 'play_arrow'}</span>
            {isActive ? 'PAUSE' : (timerMode === 'focus' ? 'START FOCUS' : 'START BREAK')}
          </button>
          {(isActive || timeLeft < initialTime || timerMode === 'break') && (
            <button
              onClick={() => {
                setIsActive(false);
                setTimerMode('focus'); // Reset to focus mode
                const newTime = getTimeForTemplate(activeTemplateId);
                setInitialTime(newTime);
                setTimeLeft(newTime);
                localStorage.removeItem(STORAGE_KEYS.TIMER_TARGET);
                localStorage.removeItem(STORAGE_KEYS.TIMER_ACTIVE);
                localStorage.setItem('tempo_timer_mode', 'focus');
                localStorage.setItem('tempo_timer_initialTime', String(newTime));
                try {
                  const w = window as any;
                  if (w.chrome?.runtime?.sendMessage) {
                    w.chrome.runtime.sendMessage({ action: 'stopTimer' });
                  }
                } catch (e) { }
              }}
              className="w-10 h-10 rounded-full bg-white/10 text-white border border-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              title="Reset Timer"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
            </button>
          )}
        </div>
      </div>

      {/* Focus Beat - Compact Design */}
      <div className="mt-2 w-full rounded-xl bg-surface-dark/80 border border-white/5 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">music_note</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Focus Beat</span>
            {isActive && beatEnabled && (
              <span className="text-[10px] font-bold text-primary tabular-nums">{beatCount}</span>
            )}
          </div>
          <button
            onClick={handleBeatToggle}
            className={`w-9 h-5 rounded-full transition-colors relative ${beatEnabled ? 'bg-primary' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${beatEnabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
        {beatEnabled && (
          <div className="mt-2 space-y-2">
            {/* Sound Type Selector - Compact 8 in a row */}
            <div className="flex gap-1">
              {beatSoundOptions.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => handleBeatSoundTypeChange(sound.id)}
                  title={sound.name}
                  className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all ${beatSoundType === sound.id
                    ? 'bg-primary/20 border border-primary/40 text-primary'
                    : 'bg-white/5 border border-transparent text-muted hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">{sound.icon}</span>
                </button>
              ))}
            </div>
            {/* Interval Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted shrink-0">Every</span>
              <div className="relative">
                <select
                  value={beatInterval}
                  onChange={(e) => handleBeatIntervalChange(Number(e.target.value))}
                  className="appearance-none bg-white/5 border border-white/10 text-xs font-bold text-white rounded-lg pl-3 pr-7 py-1 focus:outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  {Array.from({ length: 60 }, (_, i) => i + 1).map(s => (
                    <option key={s} value={s} className="bg-surface-dark text-white">{s}s</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[10px] text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
              </div>
              <span className="text-[10px] text-muted">sec</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Task Input - Compact */}
      <div className="mt-2 w-full rounded-xl bg-surface-dark/80 border border-white/5 p-2.5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="+ Add quick task..."
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickTaskCreate()}
            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-primary/50 outline-none placeholder-muted/50"
          />
          <button
            onClick={handleQuickTaskCreate}
            disabled={!quickTaskTitle.trim() || isSyncingTask}
            className="px-2.5 bg-primary rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light transition-colors"
          >
            {isSyncingTask ? (
              <span className="material-symbols-outlined text-sm text-white animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm text-white">add</span>
            )}
          </button>
          {isGoogleConnected && (
            <div className="flex items-center" title="Synced with Google Tasks">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            </div>
          )}
        </div>
      </div>

      {/* Current Task Card */}
      <div className="mt-3 w-full rounded-xl bg-white dark:bg-surface-dark/80 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all shadow-sm dark:shadow-none">
        <div className="flex items-center p-3">
          {/* Complete task button */}
          {currentTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTasks(prev => prev.map(t => t.id === currentTask.id ? { ...t, completed: true, updatedAt: Date.now() } : t));
                setCurrentTask(null);
              }}
              className="w-6 h-6 rounded-full border-2 border-gray-400 dark:border-muted hover:border-green-500 hover:bg-green-500/10 flex items-center justify-center shrink-0 mr-3 transition-colors group"
              title="Complete task"
            >
              <span className="material-symbols-outlined text-[12px] text-transparent group-hover:text-green-500 transition-colors">check</span>
            </button>
          )}
          <div className="flex-1 min-w-0 mr-3 cursor-pointer" onClick={() => setShowTaskSelector(true)}>
            <p className="text-[9px] font-semibold text-gray-500 dark:text-muted uppercase tracking-wider mb-0.5">Current Task</p>
            <h3 className="text-gray-900 dark:text-white text-xs font-bold truncate">{currentTask?.title || 'No task selected'}</h3>
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
          <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => setShowTaskSelector(true)}>
            <span className="material-symbols-outlined text-xs text-gray-500 dark:text-muted">expand_more</span>
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
          {soundFilterOptions.map(cat => (
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
        {showSeparatedBinauralSection ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[14px] text-blue-300">psychology</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Binaural Beats</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {visibleBinauralTracks.map(renderSoundCard)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[14px] text-cyan-300">music_note</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Soundscapes</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {visibleAmbientAndToneTracks.map(renderSoundCard)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {displayTracks.map(renderSoundCard)}
          </div>
        )}

        {/* Show More / Less */}
        {canToggleShowAllTracks && (
          <button
            onClick={() => setShowAllSounds(!showAllSounds)}
            className="w-full mt-2 py-1.5 text-[10px] font-semibold text-primary hover:text-primary-light transition-colors flex items-center justify-center gap-1"
          >
            {showAllSounds ? 'Show Less' : `Show All (${filteredTracks.length})`}
            <span className="material-symbols-outlined text-xs">{showAllSounds ? 'expand_less' : 'expand_more'}</span>
          </button>
        )}
        {audioError && (
          <p className="mt-2 text-[10px] text-red-400">{audioError}</p>
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
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              if (youtubeError) setYoutubeError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleYoutubePlay()}
            className="flex-1 bg-surface-dark border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white placeholder-muted/50 focus:outline-none focus:border-primary/40 transition-colors"
          />
          <button
            onClick={handleYoutubeToggle}
            disabled={isStartingYouTube || (!isYouTubeStreamActive && !youtubeUrl.trim())}
            className={`px-3 rounded-lg flex items-center justify-center transition-colors ${
              isYouTubeStreamActive
                ? 'bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30'
                : youtubeUrl.trim() && !isStartingYouTube
                  ? 'bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30'
                  : 'bg-white/5 text-muted/30 border border-white/5'
            }`}
            title={isYouTubeStreamActive ? 'Turn YouTube off' : 'Start YouTube stream'}
          >
            <span className={`material-symbols-outlined text-base ${isStartingYouTube ? 'animate-spin' : ''}`}>
              {isStartingYouTube ? 'progress_activity' : isYouTubeStreamActive ? 'stop_circle' : 'play_circle'}
            </span>
          </button>
        </div>
        {youtubeError && (
          <p className="mt-1 text-[10px] text-red-400">{youtubeError}</p>
        )}

        {/* YouTube Now Playing */}
        {audioState.isPlaying && audioState.youtubeId && !audioState.activeTrackId && (
          <div className="mt-2 flex items-center gap-2 bg-red-500/5 rounded-lg border border-red-500/10 px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0"></span>
            <span className="material-symbols-outlined text-xs text-red-400">smart_display</span>
            <span className="text-[10px] font-semibold text-white/70 flex-1">YouTube Audio Playing</span>
            <button
              onClick={async () => {
                // Stop YouTube in offscreen document
                if (useOffscreen) {
                  await stopYouTubeOffscreen();
                }
                setAudioState(prev => ({ ...prev, isPlaying: false, youtubeId: null }));
                setYoutubeError(null);
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
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${timerMode === 'break' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
              <span className={`material-symbols-outlined text-4xl ${timerMode === 'break' ? 'text-green-400' : 'text-blue-400'}`}>
                {timerMode === 'break' ? 'celebration' : 'coffee'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {timerMode === 'break' ? 'Focus Session Complete!' : 'Break Complete!'}
            </h3>
            <p className="text-sm text-muted mb-5">
              {timerMode === 'break' ? 'Great work! Time for a break.' : 'Ready for another focus session?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCompletionNotification(false);
                  // Start the timer (break or next focus session is already set up)
                  setIsActive(true);
                  const target = Date.now() + (timeLeft * 1000);
                  localStorage.setItem(STORAGE_KEYS.TIMER_TARGET, String(target));
                  localStorage.setItem(STORAGE_KEYS.TIMER_ACTIVE, 'true');
                  localStorage.setItem(STORAGE_KEYS.TIMER_MODE, activeTemplateId);
                  localStorage.setItem('tempo_timer_mode', timerMode);
                  localStorage.setItem('tempo_timer_initialTime', String(initialTime));
                  try {
                    const w = window as any;
                    if (w.chrome?.runtime?.sendMessage) {
                      w.chrome.runtime.sendMessage({ action: 'startTimer', seconds: timeLeft, mode: timerMode });
                    }
                  } catch (e) { }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-colors"
              >
                {timerMode === 'break' ? 'Start Break' : 'Start Focus'}
              </button>
              <button
                onClick={() => {
                  setShowCompletionNotification(false);
                  // Skip - reset to focus mode if currently on break
                  if (timerMode === 'break') {
                    // User wants to skip break, stay on break timer but don't start
                  } else {
                    // User finished break but doesn't want to start focus yet
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
