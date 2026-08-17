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
import { HealthRemindersScreen } from './screens/HealthRemindersScreen';
import { HelpScreen } from './screens/HelpScreen';
import { configManager } from './config';
import { STORAGE_KEYS, UI_DIMENSIONS, EXTERNAL_URLS } from './config/constants';
import { getTasks, saveTasks, getSettings, getAdminConfig } from './services/storageService';

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

// Screens reachable via ?screen=... — used by the mini timer and alarm page to
// deep-link back into the popup.
//
// Deliberately excludes ADMIN: routing to it here previously bypassed the login
// and onboarding gates entirely (chrome-extension://<id>/index.html?screen=admin).
const SCREEN_ROUTES: Record<string, Screen> = {
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
  'health-reminders': Screen.HEALTH_REMINDERS,
  help: Screen.HELP,
};

const App: React.FC = () => {
  // In-tab notification system
  const { notification, showNotification, dismissNotification } = useInTabNotification();

  const getInitialScreen = (): Screen => {
    // Gates come first. Honouring ?screen= before these checks let a brand-new
    // user land straight in Settings (or the admin panel) with no first run.
    const loginMethod = localStorage.getItem(STORAGE_KEYS.LOGIN_METHOD);
    if (!loginMethod) return Screen.LOGIN;

    const hasOnboarded = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
    if (!hasOnboarded) return Screen.ONBOARDING;

    // Only an onboarded user may deep-link, and only to a whitelisted screen.
    const screenParam = new URLSearchParams(window.location.search).get('screen');
    if (screenParam) {
      const route = SCREEN_ROUTES[screenParam.toLowerCase()];
      if (route) return route;
    }

    return Screen.TIMER;
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(getInitialScreen());
  const [audioState, setAudioState] = useState<AudioState>(createInitialAudioState());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

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

      // 3. Check maintenance mode (admin-controlled, same Chrome profile).
      // The previous bypass trusted an unsigned localStorage token, which any
      // user could forge. Development builds bypass it; production does not.
      const adminConfig = await getAdminConfig();
      if (adminConfig.maintenanceMode && !import.meta.env.DEV) {
        setIsMaintenanceMode(true);
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
              // Previously a no-op with a comment claiming the timer screen
              // handled it — nothing did. Send the user there explicitly.
              label: 'Start Break',
              onClick: () => setCurrentScreen(Screen.TIMER),
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

  // Health reminders are owned by the service worker (see syncHealthAlarms in
  // public/background.js). They used to run as setInterval timers here, which
  // meant they only ticked while the popup happened to be open — with a default
  // 30-minute interval, they effectively never fired.

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
      case Screen.HEALTH_REMINDERS:
        return <HealthRemindersScreen {...props} />;
      case Screen.HELP:
        return <HelpScreen setScreen={setCurrentScreen} />;
      default:
        return <TimerScreen {...props} />;
    }
  };

  // Detect if running in a full browser tab (not popup)
  const [isFullTab, setIsFullTab] = useState(() =>
    window.innerWidth > UI_DIMENSIONS.POPUP_WIDTH + 60 && window.innerHeight > UI_DIMENSIONS.POPUP_HEIGHT + 60
  );

  useEffect(() => {
    const updateIsFullTab = () => {
      setIsFullTab(
        window.innerWidth > UI_DIMENSIONS.POPUP_WIDTH + 60 &&
        window.innerHeight > UI_DIMENSIONS.POPUP_HEIGHT + 60
      );
    };

    updateIsFullTab();
    window.addEventListener('resize', updateIsFullTab);
    return () => window.removeEventListener('resize', updateIsFullTab);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('tempo-full-tab', isFullTab);
    document.body.classList.toggle('tempo-full-tab', isFullTab);
    const root = document.getElementById('root');
    if (root) root.classList.toggle('tempo-full-tab', isFullTab);

    return () => {
      document.documentElement.classList.remove('tempo-full-tab');
      document.body.classList.remove('tempo-full-tab');
      if (root) root.classList.remove('tempo-full-tab');
    };
  }, [isFullTab]);

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

        {/* YouTube audio is now handled by the offscreen document for persistence */}

        {isMaintenanceMode ? (
          <div className="absolute inset-0 bg-background-dark flex flex-col items-center justify-center p-6 text-center z-50">
            <span className="material-symbols-outlined text-5xl text-yellow-400 mb-4">construction</span>
            <h2 className="text-xl font-bold mb-2">Under Maintenance</h2>
            <p className="text-muted text-sm leading-relaxed">Tempo is currently undergoing maintenance. Please check back soon.</p>
          </div>
        ) : (
          <>
            {renderScreen()}
            <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />
          </>
        )}

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
