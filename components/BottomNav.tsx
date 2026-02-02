import React from 'react';
import { Screen, NavProps } from '../types';
import { configManager } from '../config';
import { SCREENS_WITHOUT_NAV } from '../config/constants';

export const BottomNav: React.FC<NavProps> = ({ currentScreen, setScreen }) => {
  // Hide nav on splash, onboarding, login, or modal-like screens
  if (SCREENS_WITHOUT_NAV.includes(currentScreen as any)) return null;

  // Load navigation items from config
  const config = configManager.getConfig();
  const navItems = config.navigation.map(item => ({
    id: Screen[item.id as keyof typeof Screen],
    icon: item.icon,
    label: item.label,
  }));

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
                isActive ? 'text-primary transform -translate-y-1' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive ? 'fill-current' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_currentColor]"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};