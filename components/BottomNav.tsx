import React from 'react';
import { Screen, NavProps } from '../types';

export const BottomNav: React.FC<NavProps> = ({ currentScreen, setScreen }) => {
  // Hide nav on splash, onboarding, or modal-like screens
  if ([Screen.SPLASH, Screen.ONBOARDING, Screen.QUICK_ADD].includes(currentScreen)) return null;

  const navItems = [
    { id: Screen.TIMER, icon: 'timer', label: 'Timer' },
    { id: Screen.TASKS, icon: 'check_circle', label: 'Tasks' },
    { id: Screen.STATS, icon: 'bar_chart', label: 'Stats' },
    { id: Screen.SOCIAL, icon: 'group', label: 'Social' },
    { id: Screen.PROFILE, icon: 'person', label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface-dark/95 backdrop-blur-md border-t border-white/5 pb-6 pt-2 px-6 z-40">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                isActive ? 'text-secondary transform -translate-y-1' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive ? 'fill-current' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-secondary rounded-full shadow-[0_0_8px_currentColor]"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};