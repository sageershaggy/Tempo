import React, { useState } from 'react';
import { Screen } from './types';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './screens/SplashScreen';
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

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SPLASH);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.SPLASH:
        return <SplashScreen setScreen={setCurrentScreen} />;
      case Screen.ONBOARDING:
        return <OnboardingScreen setScreen={setCurrentScreen} />;
      case Screen.TIMER:
        return <TimerScreen setScreen={setCurrentScreen} />;
      case Screen.TASKS:
        return <TasksScreen setScreen={setCurrentScreen} />;
      case Screen.STATS:
        return <StatsScreen setScreen={setCurrentScreen} />;
      case Screen.SETTINGS:
        return <SettingsScreen setScreen={setCurrentScreen} />;
      case Screen.PROFILE:
        return <ProfileScreen setScreen={setCurrentScreen} />;
      case Screen.SOCIAL:
        return <SocialScreen setScreen={setCurrentScreen} />;
      case Screen.QUICK_ADD:
        return <QuickAddScreen setScreen={setCurrentScreen} />;
      case Screen.AUDIO:
        return <AudioScreen setScreen={setCurrentScreen} />;
      case Screen.MILESTONES:
        return <MilestonesScreen setScreen={setCurrentScreen} />;
      default:
        return <TimerScreen setScreen={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center bg-black font-sans text-white">
      <div className="w-full max-w-md h-screen relative bg-background-dark shadow-2xl overflow-hidden sm:border-x sm:border-white/5">
        {renderScreen()}
        <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />
      </div>
    </div>
  );
};

export default App;