import React, { useState, useEffect } from 'react';
declare var chrome: any;
import { Screen, AudioState, Task } from './types';
import { BottomNav } from './components/BottomNav';
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
import { configManager } from './config';
import { STORAGE_KEYS, UI_DIMENSIONS, EXTERNAL_URLS } from './config/constants';
import { getTasks, saveTasks } from './services/storageService';

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
};

const App: React.FC = () => {
  const getInitialScreen = (): Screen => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');

    // Dynamic screen routing from URL params
    if (screenParam) {
      const route = SCREEN_ROUTES[screenParam.toLowerCase()];
      if (route) return route;
    }

    // Check if user has completed onboarding/splash
    const hasOnboarded = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
    return hasOnboarded ? Screen.TIMER : Screen.SPLASH;
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(getInitialScreen());
  const [audioState, setAudioState] = useState<AudioState>(createInitialAudioState());
const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        return <MilestonesScreen setScreen={setCurrentScreen} />;
case Screen.ADMIN:
        return <AdminScreen setScreen={setCurrentScreen} />;
      case Screen.CALENDAR:
        return <CalendarScreen setScreen={setCurrentScreen} />;
      case Screen.PRIVACY_POLICY:
        return <PrivacyPolicyScreen setScreen={setCurrentScreen} />;
      case Screen.TERMS:
        return <TermsScreen setScreen={setCurrentScreen} />;
      case Screen.INTEGRATIONS:
        return <IntegrationsScreen setScreen={setCurrentScreen} />;
      default:
        return <TimerScreen {...props} />;
    }
  };

  return (
    <div className={`h-[${UI_DIMENSIONS.POPUP_HEIGHT}px] w-[${UI_DIMENSIONS.POPUP_WIDTH}px] flex justify-center bg-black font-sans text-white overflow-hidden`}>
      <div className="w-full h-full relative bg-background-dark shadow-2xl overflow-hidden group">

        {/* Open in New Tab Button */}
        <button
          onClick={() => window.open(chrome.runtime.getURL('index.html'))}
          className="absolute top-2 right-2 z-50 p-2 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          title="Open in new tab"
        >
          <span className="material-symbols-outlined text-lg">open_in_new</span>
        </button>

        {/* Persistent Audio Player (Hidden/Background) */}
        {audioState.youtubeId && (
          <div className={`fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden`}>
            <iframe
              width="200"
              height="200"
              src={`${EXTERNAL_URLS.YOUTUBE_EMBED}/${audioState.youtubeId}?autoplay=${audioState.isPlaying ? 1 : 0}&loop=1&playlist=${audioState.youtubeId}&enablejsapi=1`}
              title="Background Audio"
              allow="autoplay"
            ></iframe>
          </div>
        )}

        {renderScreen()}
        <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />
      </div>
    </div>
  );
};

export default App;