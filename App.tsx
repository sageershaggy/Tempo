import React, { useState, useEffect, useCallback } from 'react';
declare var chrome: any;
import { Screen, AudioState, Task } from './types';
import { BottomNav } from './components/BottomNav';
import { InTabNotification, NotificationData, useInTabNotification } from './components/InTabNotification';
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TimerScreen } from './screens/TimerScreen';
import { TasksScreen } from './screens/TasksScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SocialScreen } from './screens/SocialScreen';
import { QuickAddScreen } from './screens/QuickAddScreen';
import { AudioScreen } from './screens/AudioScreen';
import { MilestonesScreen } from './screens/MilestonesScreen';
import { AdminScreen } from './screens/AdminScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { TermsScreen } from './screens/TermsScreen';
import { IntegrationsScreen } from './screens/IntegrationsScreen';
import { HealthScreen } from './screens/HealthScreen';
import { configManager } from './config';
import { STORAGE_KEYS, UI_DIMENSIONS, EXTERNAL_URLS } from './config/constants';
import { getTasks, saveTasks, getSettings, getHealthSettings } from './services/storageService';

// Apply theme CSS variables to the document
const applyTheme = (themeId: string) => {
  const config = configManager.getConfig();
  const theme = config.themes.find(t => t.id === themeId);
  if (theme) {
    document.documentElement.style.setProperty('--color-primary', theme.cssVar);
    // Generate a lighter variant for primary-light
    document.documentElement.style.setProperty('--color-primary-light', theme.cssVar + 'CC');
    // Make secondary color match primary for consistent theming
    document.documentElement.style.setProperty('--color-secondary', theme.cssVar);
  }
};

// Create initial audio state from config
const createInitialAudioState = (): AudioState => {
  const config = configManager.getConfig();
  return {
    isPlaying: false,
    activeTrackId: null,
    youtubeId: null,
    volume: config.defaults.audio.volume,
    autoPlay: config.defaults.audio.autoPlay,
    trackSettings: {}
  };
};

// Screen routing map for dynamic URL-based navigation
const SCREEN_ROUTES: Record<string, Screen> = {
  admin: Screen.ADMIN,
  tasks: Screen.TASKS,
  stats: Screen.STATS,
  settings: Screen.SETTINGS,
  timer: Screen.TIMER,
  social: Screen.SOCIAL,
  profile: Screen.PROFILE,
  audio: Screen.AUDIO,
  milestones: Screen.MILESTONES,
  calendar: Screen.CALENDAR,
  health: Screen.HEALTH,
};

const App: React.FC = () => {
  // In-tab notification system
  const { notification, showNotification, dismissNotification } = useInTabNotification();

  const getInitialScreen = (): Screen => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');

    // Dynamic screen routing from URL params
    if (screenParam) {
      const route = SCREEN_ROUTES[screenParam.toLowerCase()];
      if (route) return route;
    }

    // Check for login status
    const loginMethod = localStorage.getItem('tempo_login_method');
    if (!loginMethod) return Screen.LOGIN;

    // Check if user has completed onboarding
    const hasOnboarded = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
    return hasOnboarded ? Screen.TIMER : Screen.ONBOARDING;
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(getInitialScreen());
  const [audioState, setAudioState] = useState<AudioState>(createInitialAudioState());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration and theme on mount
  useEffect(() => {
    const initApp = async () => {
      // 1. Load config (templates, categories, etc.)
      await configManager.loadConfig();

      // 2. Load user settings (theme, timer durations)
      const settings = await getSettings();
      if (settings.theme) {
        applyTheme(settings.theme);
      }
      // Apply dark mode preference
      if (settings.darkMode !== undefined) {
        document.documentElement.classList.toggle('dark', settings.darkMode);
      } else {
        // Default to dark mode if not set
        document.documentElement.classList.add('dark');
      }
    };
    initApp();
  }, []);

  // Load tasks from storage on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const savedTasks = await getTasks();
        if (savedTasks && savedTasks.length > 0) {
          setTasks(savedTasks);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, []);

  // Save tasks when they change
  useEffect(() => {
    if (!isLoading && tasks.length >= 0) {
      saveTasks(tasks);
    }
  }, [tasks, isLoading]);

  // Check for due task reminders
  const checkTaskReminders = useCallback(() => {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    tasks.forEach(task => {
      if (task.completed || !task.dueDate || !task.reminderEnabled) return;

      // Check if snoozed
      if (task.snoozedUntil && new Date(task.snoozedUntil) > now) return;

      const dueDate = new Date(task.dueDate);

      // Show reminder if task is due within 15 minutes or already overdue
      if (dueDate <= fifteenMinutesFromNow) {
        const isOverdue = dueDate < now;
        const reminderKey = `reminder_shown_${task.id}_${task.dueDate}`;

        // Only show reminder once per session unless snoozed
        if (!sessionStorage.getItem(reminderKey)) {
          sessionStorage.setItem(reminderKey, 'true');

          showNotification({
            type: 'reminder',
            title: isOverdue ? 'Task Overdue!' : 'Task Due Soon',
            message: task.title,
            icon: isOverdue ? 'warning' : 'schedule',
            actions: [
              {
                label: '1h',
                onClick: () => handleSnoozeTask(task.id, 60),
              },
              {
                label: '1d',
                onClick: () => handleSnoozeTask(task.id, 1440),
              },
              {
                label: '2d',
                onClick: () => handleSnoozeTask(task.id, 2880),
              },
              {
                label: 'View',
                onClick: () => setCurrentScreen(Screen.TASKS),
                primary: true,
              },
            ],
          });
        }
      }
    });
  }, [tasks, showNotification]);

  // Handle snoozing a task
  const handleSnoozeTask = useCallback((taskId: string, minutes: number) => {
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    // Update state and IMMEDIATE SAVE to storage to prevent data loss on popup close
    setTasks(prev => {
      const newTasks = prev.map(t =>
        t.id === taskId ? { ...t, snoozedUntil: snoozeUntil } : t
      );
      // Fire and forget save
      saveTasks(newTasks).catch(err => console.error('Failed to save snoozed task:', err));
      return newTasks;
    });

    // Clear the reminder key so it can show again after snooze
    const task = tasks.find(t => t.id === taskId);
    if (task?.dueDate) {
      sessionStorage.removeItem(`reminder_shown_${taskId}_${task.dueDate}`);
    }
  }, [tasks, setTasks]);

  // Check reminders periodically
  useEffect(() => {
    // Initial check after tasks load
    if (!isLoading && tasks.length > 0) {
      const timeout = setTimeout(checkTaskReminders, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, tasks.length]);

  useEffect(() => {
    // Check every minute for due tasks
    const interval = setInterval(checkTaskReminders, 60000);
    return () => clearInterval(interval);
  }, [checkTaskReminders]);

  // Listen for timer completion from background
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === 'showTimerNotification') {
        showNotification({
          type: 'timer',
          title: 'Focus Session Complete!',
          message: 'Great work! Time for a well-deserved break.',
          icon: 'celebration',
          actions: [
            {
              label: 'Start Break',
              onClick: () => { }, // Will be handled by timer screen
              primary: true,
            },
          ],
        });
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }
  }, [showNotification]);

  // Health reminder system — independent timer per health type
  useEffect(() => {
    const healthTimers: ReturnType<typeof setInterval>[] = [];
    let cancelled = false;

    const HEALTH_TIPS: Record<string, { title: string; message: string; icon: string }> = {
      screen_break: { title: 'Screen Break', message: 'Take a moment to look away from your screen and rest your eyes.', icon: 'visibility_off' },
      water: { title: 'Drink Water', message: 'Stay hydrated! Grab a glass of water.', icon: 'water_drop' },
      stretch: { title: 'Time to Stretch', message: 'Stand up and stretch your body for a minute.', icon: 'self_improvement' },
      eye_rest: { title: 'Eye Rest (20-20-20)', message: 'Look at something 20 feet away for 20 seconds.', icon: 'remove_red_eye' },
      posture: { title: 'Posture Check', message: 'Sit up straight, relax your shoulders.', icon: 'accessibility_new' },
    };

    const setupHealthReminders = async () => {
      const healthSettings = await getHealthSettings();
      if (!healthSettings.enabled || cancelled) return;

      // Create an independent interval for each enabled health type
      Object.entries(healthSettings.types).forEach(([typeId, typeConfig]) => {
        if (!typeConfig.enabled || typeConfig.reminderCount <= 0) return;

        let remindersShown = 0;
        const intervalMs = typeConfig.intervalMinutes * 60 * 1000;
        const tip = HEALTH_TIPS[typeId];
        if (!tip) return;

        const timer = setInterval(() => {
          if (remindersShown >= typeConfig.reminderCount) {
            clearInterval(timer);
            return;
          }
          remindersShown++;
          showNotification({
            type: 'reminder',
            title: tip.title,
            message: `${tip.message} (${remindersShown}/${typeConfig.reminderCount})`,
            icon: tip.icon,
            actions: [
              { label: 'Done', onClick: () => {}, primary: true },
              { label: 'Dismiss', onClick: () => {} },
            ],
          });
        }, intervalMs);

        healthTimers.push(timer);
      });
    };

    setupHealthReminders();

    return () => {
      cancelled = true;
      healthTimers.forEach(timer => clearInterval(timer));
    };
  }, [showNotification]);

  const renderScreen = () => {
    const props = {
      setScreen: setCurrentScreen,
      audioState,
      setAudioState,
      tasks,
      setTasks,
      currentTask,
      setCurrentTask
    };

    switch (currentScreen) {
      case Screen.SPLASH:
        return <SplashScreen setScreen={setCurrentScreen} />;
      case Screen.LOGIN:
        return <LoginScreen setScreen={setCurrentScreen} />;
      case Screen.ONBOARDING:
        return <OnboardingScreen setScreen={setCurrentScreen} />;
      case Screen.TIMER:
        return <TimerScreen {...props} />;
      case Screen.TASKS:
        return <TasksScreen {...props} />;
      case Screen.STATS:
        return <StatsScreen {...props} />;
      case Screen.SETTINGS:
        return <SettingsScreen {...props} />;
      case Screen.PROFILE:
        return <ProfileScreen {...props} />;
      case Screen.SOCIAL:
        return <SocialScreen {...props} />;
      case Screen.QUICK_ADD:
        return <QuickAddScreen {...props} />;
      case Screen.AUDIO:
        return <AudioScreen {...props} />;
      case Screen.MILESTONES:
        return <MilestonesScreen setScreen={setCurrentScreen} tasks={tasks} />;
      case Screen.ADMIN:
        return <AdminScreen setScreen={setCurrentScreen} />;
      case Screen.CALENDAR:
        return <CalendarScreen {...props} />;
      case Screen.PRIVACY_POLICY:
        return <PrivacyPolicyScreen setScreen={setCurrentScreen} />;
      case Screen.TERMS:
        return <TermsScreen setScreen={setCurrentScreen} />;
      case Screen.INTEGRATIONS:
        return <IntegrationsScreen {...props} />;
      case Screen.HEALTH:
        return <HealthScreen {...props} />;
      default:
        return <TimerScreen {...props} />;
    }
  };

  // Detect if running in a full browser tab (not popup)
  const [isFullTab] = useState(() => window.innerWidth > 500);

  return (
    <div
      className="font-sans text-white overflow-hidden"
      style={isFullTab ? {
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)',
      } : {
        height: `${UI_DIMENSIONS.POPUP_HEIGHT}px`,
        width: `${UI_DIMENSIONS.POPUP_WIDTH}px`,
        display: 'flex',
        justifyContent: 'center',
        background: '#000',
      }}
    >
      <div
        className="relative bg-background-dark shadow-2xl overflow-hidden group"
        style={isFullTab ? {
          width: '440px',
          height: '720px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 120px rgba(127,19,236,0.12), 0 20px 60px rgba(0,0,0,0.5)',
        } : {
          width: '100%',
          height: '100%',
        }}
      >

        {/* Persistent Audio Player (Hidden/Background) */}
        {audioState.youtubeId && (
          <div className="fixed -top-[300px] -left-[300px] pointer-events-none" style={{ width: 320, height: 240 }}>
            <iframe
              width="320"
              height="240"
              src={`${EXTERNAL_URLS.YOUTUBE_EMBED}/${audioState.youtubeId}?autoplay=${audioState.isPlaying ? 1 : 0}&loop=1&playlist=${audioState.youtubeId}&enablejsapi=1&mute=0`}
              title="Background Audio"
              allow="autoplay; encrypted-media"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        )}

        {renderScreen()}
        <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />

        {/* In-Tab Notification Popup */}
        <InTabNotification
          notification={notification}
          onDismiss={dismissNotification}
          playSound={true}
        />
      </div>
    </div>
  );
};

export default App;