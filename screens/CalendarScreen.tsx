import React, { useState } from 'react';
import { Screen, Task } from '../types';

export const CalendarScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const generateDays = () => {
      const days: (number | null)[] = [];
      for (let i = 0; i < startDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(i);
      return days;
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const getTaskDot = (day: number) => {
      if (!day) return null;
      // Mock logic - in real app, check tasks for this day
      if (day % 3 === 0) return <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>;
      if (day % 5 === 0) return <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>;
      if (isToday(day)) return <div className="flex gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div></div>;
      return null;
  };

  const formatSelectedDate = () => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    return date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
       <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
            <button onClick={() => setScreen(Screen.TASKS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
            <h2 className="font-bold text-lg">Calendar</h2>
            <button onClick={() => setScreen(Screen.QUICK_ADD)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">add</span></button>
       </div>

       <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button
                      onClick={goToPrevMonth}
                      className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button
                      onClick={goToToday}
                      className="px-3 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={goToNextMonth}
                      className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-4">
                {dayNames.map((d, idx) => (
                    <div key={`day-${idx}`} className="text-center text-xs font-bold text-muted py-2">{d[0]}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                {generateDays().map((day, i) => (
                    <div
                      key={`cell-${i}`}
                      className="flex flex-col items-center h-12 cursor-pointer group"
                      onClick={() => day && setSelectedDay(day)}
                    >
                        {day && (
                            <>
                                <span className={`text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-all
                                  ${day === selectedDay
                                    ? 'bg-primary text-white shadow-lg scale-110'
                                    : isToday(day)
                                      ? 'bg-primary/30 text-primary-light ring-2 ring-primary/50'
                                      : 'text-white group-hover:bg-white/10'
                                  }`}>
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
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">{formatSelectedDate()}</h3>
                <div className="space-y-3">
                    {selectedDay % 2 === 0 ? (
                      <>
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
                      </>
                    ) : selectedDay % 3 === 0 ? (
                      <div className="bg-surface-dark p-4 rounded-xl border border-white/5 flex items-center gap-4">
                          <div className="w-1 h-10 bg-secondary rounded-full"></div>
                          <div>
                              <p className="font-bold text-sm">Sprint Planning</p>
                              <p className="text-xs text-muted">10:00 AM • Conference Room</p>
                          </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted">
                        <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">event_available</span>
                        <p className="text-sm">No events scheduled</p>
                        <button
                          onClick={() => setScreen(Screen.QUICK_ADD)}
                          className="mt-3 text-primary text-xs font-bold hover:underline"
                        >
                          + Add a task
                        </button>
                      </div>
                    )}
                </div>
            </div>
       </div>
    </div>
  );
};
