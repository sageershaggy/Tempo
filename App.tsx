import React, { useState } from 'react';
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
import { TempoProScreen } from './screens/TempoProScreen';
import { AdminScreen } from './screens/AdminScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { TermsScreen } from './screens/TermsScreen';

const INITIAL_AUDIO_STATE: AudioState = {
  isPlaying: false,
  activeTrackId: null,
  youtubeId: null,
  volume: 70,
  autoPlay: false,
  trackSettings: {}
};

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Review Q3 Financials',
    category: 'Finance',
    priority: 'High',
    dueDate: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    completed: false,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 50000,
    notes: 'Focus on the marketing budget variances.',
    subtasks: []
  },
  {
    id: '2',
    title: 'Call Architect',
    category: 'Project A',
    priority: 'Medium',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    completed: false,
    createdAt: Date.now() - 200000,
    subtasks: [
      { id: 's1', title: 'Discuss blueprints', completed: false },
      { id: 's2', title: 'Confirm budget', completed: true }
    ]
  },
  {
    id: '3',
    title: 'Update Client Presentation',
    category: 'Design',
    priority: 'Low',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    completed: false,
    createdAt: Date.now() - 300000,
    subtasks: []
  }
];

const App: React.FC = () => {
  const getInitialScreen = (): Screen => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    
    switch (screenParam?.toLowerCase()) {
      case 'admin': return Screen.ADMIN;
      case 'pro': return Screen.TEMPO_PRO;
      case 'tasks': return Screen.TASKS;
      case 'stats': return Screen.STATS;
      case 'settings': return Screen.SETTINGS;
      default: return Screen.SPLASH;
    }
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(getInitialScreen());
  const [audioState, setAudioState] = useState<AudioState>(INITIAL_AUDIO_STATE);
  const [isPro, setIsPro] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const renderScreen = () => {
    const props = {
        setScreen: setCurrentScreen,
        audioState,
        setAudioState,
        isPro,
        setIsPro,
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
      case Screen.TEMPO_PRO:
        return <TempoProScreen {...props} />;
      case Screen.ADMIN:
        return <AdminScreen setScreen={setCurrentScreen} />;
      case Screen.CALENDAR:
        return <CalendarScreen setScreen={setCurrentScreen} />;
      case Screen.PRIVACY_POLICY:
        return <PrivacyPolicyScreen setScreen={setCurrentScreen} />;
      case Screen.TERMS:
        return <TermsScreen setScreen={setCurrentScreen} />;
      default:
        return <TimerScreen {...props} />;
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center bg-black font-sans text-white">
      <div className="w-full max-w-md h-screen relative bg-background-dark shadow-2xl overflow-hidden sm:border-x sm:border-white/5">
        
        {/* Persistent Audio Player (Hidden/Background) */}
        {audioState.youtubeId && (
            <div className={`fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden`}>
                 <iframe 
                    width="200" 
                    height="200" 
                    src={`https://www.youtube.com/embed/${audioState.youtubeId}?autoplay=${audioState.isPlaying ? 1 : 0}&loop=1&playlist=${audioState.youtubeId}&enablejsapi=1`}
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