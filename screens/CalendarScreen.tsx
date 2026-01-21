import React, { useState } from 'react';
import { Screen, Task } from '../types';

export const CalendarScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Mock calendar data generation
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const generateDays = () => {
      const days = [];
      for (let i = 0; i < startDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(i);
      return days;
  };

  const getTaskDot = (day: number) => {
      // Mock logic to show dots on random days
      if (!day) return null;
      if (day % 3 === 0) return <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>;
      if (day % 5 === 0) return <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>;
      if (day === 15) return <div className="flex gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div></div>;
      return null;
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
       <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
            <button onClick={() => setScreen(Screen.TASKS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
            <h2 className="font-bold text-lg">Calendar</h2>
            <button onClick={() => setScreen(Screen.QUICK_ADD)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">add</span></button>
       </div>

       <div className="p-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-white/10"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                    <button className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-white/10"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-4">
                {['S','M','T','W','T','F','S'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-muted py-2">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                {generateDays().map((day, i) => (
                    <div key={i} className="flex flex-col items-center h-10 cursor-pointer group">
                        {day && (
                            <>
                                <span className={`text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-colors ${day === 15 ? 'bg-primary text-white shadow-lg' : 'text-white group-hover:bg-white/10'}`}>
                                    {day}
                                </span>
                                <div className="mt-1 h-2">
                                    {getTaskDot(day)}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">October 15, 2023</h3>
                <div className="space-y-3">
                    <div className="bg-surface-dark p-4 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="w-1 h-10 bg-primary rounded-full"></div>
                        <div>
                            <p className="font-bold text-sm">Design System Review</p>
                            <p className="text-xs text-muted">2:00 PM • Zoom</p>
                        </div>
                    </div>
                    <div className="bg-surface-dark p-4 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="w-1 h-10 bg-blue-400 rounded-full"></div>
                        <div>
                            <p className="font-bold text-sm">Frontend Sync</p>
                            <p className="text-xs text-muted">4:30 PM • Office</p>
                        </div>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};