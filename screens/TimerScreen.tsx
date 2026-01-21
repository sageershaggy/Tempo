import React, { useState, useEffect } from 'react';
import { Screen } from '../types';

export const TimerScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 283;

  return (
    <div className="h-full flex flex-col px-6 pt-8 pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-bold">Tempo</h1>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Deep Work Mode</p>
        </div>
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center hover:bg-surface-light/80">
            <span className="material-symbols-outlined">tune</span>
        </button>
      </div>

      {/* Timer Circle */}
      <div className="relative flex items-center justify-center w-72 h-72 mx-auto mb-10">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle className="text-surface-light stroke-current" cx="50" cy="50" fill="transparent" r="45" strokeWidth="6" />
            <circle 
                className="text-primary stroke-current transition-all duration-1000 ease-linear drop-shadow-[0_0_15px_rgba(127,19,236,0.4)]" 
                cx="50" cy="50" 
                fill="transparent" r="45" 
                strokeWidth="6" 
                strokeDasharray="283"
                strokeDashoffset={283 - progress}
                strokeLinecap="round"
            />
        </svg>
        <div className="absolute flex flex-col items-center">
            <span className="text-6xl font-black tracking-tighter tabular-nums">{formatTime(timeLeft)}</span>
            <span className="text-sm font-medium text-muted mt-2 uppercase tracking-widest">{isActive ? 'Focusing' : 'Ready to Focus'}</span>
        </div>
      </div>

      {/* Main Action */}
      <div className="w-full max-w-[280px] mx-auto mb-10">
        <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-full h-14 rounded-2xl font-bold text-lg tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isActive ? 'bg-surface-light text-white' : 'bg-secondary text-white shadow-[0_4px_20px_-4px_rgba(255,107,107,0.5)]'}`}
        >
            <span className="material-symbols-outlined">{isActive ? 'pause' : 'play_arrow'}</span>
            {isActive ? 'PAUSE' : 'START FOCUS'}
        </button>
      </div>

      {/* Current Task Card */}
      <div className="relative w-full rounded-2xl bg-surface-dark p-1 mb-6 border border-white/5 overflow-hidden group cursor-pointer" onClick={() => setScreen(Screen.QUICK_ADD)}>
         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all"></div>
         <div className="relative z-10 flex items-center justify-between p-5 bg-background-dark/50 backdrop-blur-sm rounded-xl">
            <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <p className="text-primary text-xs font-bold uppercase tracking-wider">Current Task</p>
                </div>
                <h3 className="text-white text-lg font-bold truncate">Design System Audit</h3>
                <p className="text-muted text-sm">UI Kit v2 • High Priority</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">edit</span>
            </div>
         </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
            { icon: 'timer', val: '4', label: 'Sessions', color: 'text-primary' },
            { icon: 'bolt', val: '2h 15m', label: 'Focus', color: 'text-secondary' },
            { icon: 'local_fire_department', val: '5 Days', label: 'Streak', color: 'text-orange-500' }
        ].map((stat, i) => (
            <div key={i} className="bg-surface-dark rounded-xl p-3 flex flex-col items-center justify-center gap-1 border border-white/5">
                <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
                <span className="font-bold text-sm">{stat.val}</span>
                <span className="text-muted text-[10px] uppercase font-bold">{stat.label}</span>
            </div>
        ))}
      </div>
    </div>
  );
};