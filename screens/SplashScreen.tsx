import React, { useEffect } from 'react';
import { Screen } from '../types';

export const SplashScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      setScreen(Screen.LOGIN);
    }, 2500);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background-dark relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#7F13EC 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="flex-1"></div>
      
      <div className="relative z-10 flex flex-col items-center animate-slide-up">
        <div className="w-32 h-32 mb-8 bg-surface-light rounded-3xl shadow-[0_0_40px_-10px_rgba(127,19,236,0.5)] flex items-center justify-center border border-white/5">
            <span className="material-symbols-outlined text-primary text-6xl">hourglass_empty</span>
            <div className="absolute -bottom-2 -right-2 bg-secondary rounded-full p-2 border-4 border-background-dark">
                <span className="material-symbols-outlined text-white text-xl">check</span>
            </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Tempo</h1>
        <p className="text-primary text-lg font-medium tracking-wide">Focus. Track. Achieve.</p>
      </div>

      <div className="flex-1"></div>

      <div className="w-full px-12 pb-16 animate-fade-in opacity-0" style={{ animationDelay: '0.5s' }}>
        <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Loading</span>
        </div>
        <div className="h-1.5 w-full bg-surface-light rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary w-2/3 rounded-full animate-pulse"></div>
        </div>
        <div className="mt-4 text-center">
            <p className="text-xs text-muted/50">v2.0.0 • Tempo Productivity Inc.</p>
        </div>
      </div>
    </div>
  );
};