import React, { useState, useMemo } from 'react';
import { Screen, Task, GlobalProps } from '../types';

// Priority color mapping
const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-400',
  Medium: 'bg-primary',
  Low: 'bg-blue-400',
};

const PRIORITY_BORDER: Record<string, string> = {
  High: 'border-red-400/30',
  Medium: 'border-primary/30',
  Low: 'border-blue-400/30',
};

const PRIORITY_BAR: Record<string, string> = {
  High: 'bg-red-400',
  Medium: 'bg-primary',
  Low: 'bg-blue-400',
};

export const CalendarScreen: React.FC<GlobalProps> = ({ setScreen, tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const generateDays = () => {
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  // Build a map of day -> tasks for current month
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    if (!tasks) return map;

    tasks.forEach(task => {
      if (!task.dueDate) return;
      const due = new Date(task.dueDate);
      if (due.getMonth() === currentDate.getMonth() && due.getFullYear() === currentDate.getFullYear()) {
        const day = due.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(task);
      }
    });

    // Also map tasks by creation date for days with no due date tasks
    tasks.forEach(task => {
      const created = new Date(task.createdAt);
      if (created.getMonth() === currentDate.getMonth() && created.getFullYear() === currentDate.getFullYear()) {
        const day = created.getDate();
        if (!map[day]) map[day] = [];
        // Avoid duplicates
        if (!map[day].find(t => t.id === task.id)) {
          map[day].push(task);
        }
      }
    });

    return map;
  }, [tasks, currentDate]);

  // Compute daily achievements: days where all tasks are completed
  const dayAchievements = useMemo(() => {
    const achievements: Record<number, { allDone: boolean; total: number; completed: number }> = {};
    Object.entries(tasksByDay).forEach(([dayStr, dayTasks]) => {
      const day = parseInt(dayStr);
      const completed = dayTasks.filter(t => t.completed).length;
      achievements[day] = {
        allDone: dayTasks.length > 0 && completed === dayTasks.length,
        total: dayTasks.length,
        completed,
      };
    });
    return achievements;
  }, [tasksByDay]);

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

  // Get dots based on real tasks
  const getTaskDots = (day: number) => {
    if (!day) return null;
    const dayTasks = tasksByDay[day];
    if (!dayTasks || dayTasks.length === 0) return null;

    const hasHigh = dayTasks.some(t => t.priority === 'High' && !t.completed);
    const hasMedium = dayTasks.some(t => t.priority === 'Medium' && !t.completed);
    const hasLow = dayTasks.some(t => t.priority === 'Low' && !t.completed);
    const allDone = dayTasks.every(t => t.completed);

    if (allDone) {
      return <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>;
    }

    return (
      <div className="flex gap-0.5">
        {hasHigh && <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>}
        {hasMedium && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
        {hasLow && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
        {!hasHigh && !hasMedium && !hasLow && <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>}
      </div>
    );
  };

  const formatSelectedDate = () => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    return date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const selectedTasks = tasksByDay[selectedDay] || [];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TASKS)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <h2 className="font-bold text-sm">Calendar</h2>
        <button onClick={() => setScreen(Screen.QUICK_ADD)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
      </div>

      <div className="p-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-1.5">
            <button onClick={goToPrevMonth} className="w-7 h-7 rounded-lg bg-surface-light flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-xs">chevron_left</span>
            </button>
            <button onClick={goToToday} className="px-2.5 h-7 rounded-lg bg-primary/20 text-primary text-[10px] font-bold hover:bg-primary/30 transition-colors">
              Today
            </button>
            <button onClick={goToNextMonth} className="w-7 h-7 rounded-lg bg-surface-light flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-xs">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((d, idx) => (
            <div key={`day-${idx}`} className="text-center text-[10px] font-bold text-muted py-1.5">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 relative">
          {generateDays().map((day, i) => {
            const achievement = day ? dayAchievements[day] : null;
            const dayTaskList = day ? (tasksByDay[day] || []) : [];
            const isHovered = hoveredDay === day;

            return (
              <div
                key={`cell-${i}`}
                className="flex flex-col items-center h-12 cursor-pointer group relative"
                onClick={() => day && setSelectedDay(day)}
                onMouseEnter={() => day && setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {day && (
                  <>
                    {/* Achievement flag - all tasks completed */}
                    {achievement?.allDone && (
                      <div className="absolute -top-0.5 -right-0.5 z-10">
                        <span className="text-[10px]">🏆</span>
                      </div>
                    )}

                    <span className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all
                      ${day === selectedDay
                        ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                        : isToday(day)
                          ? 'bg-primary/30 text-primary-light ring-1.5 ring-primary/50'
                          : 'text-white/80 group-hover:bg-white/10'
                      }`}>
                      {day}
                    </span>
                    <div className="mt-0.5 h-2 flex items-center">
                      {getTaskDots(day)}
                    </div>

                    {/* Hover tooltip */}
                    {isHovered && dayTaskList.length > 0 && (
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 w-44 bg-surface-dark border border-white/10 rounded-lg shadow-xl p-2 pointer-events-none animate-fade-in">
                        <div className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>{dayTaskList.length} task{dayTaskList.length > 1 ? 's' : ''}</span>
                          {achievement?.allDone && <span className="text-green-400">✓ All done!</span>}
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                          {dayTaskList.slice(0, 4).map(task => (
                            <div key={task.id} className="flex items-center gap-1.5">
                              <div className={`w-1 h-1 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-white/30'}`}></div>
                              <span className={`text-[10px] truncate ${task.completed ? 'line-through text-muted' : 'text-white/90'}`}>
                                {task.title}
                              </span>
                            </div>
                          ))}
                          {dayTaskList.length > 4 && (
                            <p className="text-[9px] text-muted">+{dayTaskList.length - 4} more</p>
                          )}
                        </div>
                        {/* Tooltip arrow */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-dark border-l border-t border-white/10 rotate-45"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 mb-5">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
            <span className="text-[9px] text-muted">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span className="text-[9px] text-muted">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
            <span className="text-[9px] text-muted">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-[9px] text-muted">Done</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px]">🏆</span>
            <span className="text-[9px] text-muted">All clear</span>
          </div>
        </div>

        {/* Selected day tasks */}
        <div>
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">
            {formatSelectedDate()}
            {dayAchievements[selectedDay]?.allDone && (
              <span className="ml-2 text-green-400 normal-case">🏆 All tasks completed!</span>
            )}
          </h3>

          <div className="space-y-2">
            {selectedTasks.length > 0 ? (
              selectedTasks.map(task => (
                <div
                  key={task.id}
                  className={`bg-surface-dark p-3 rounded-xl border flex items-center gap-3 transition-all hover:border-white/15 ${
                    task.completed ? 'border-green-500/10 opacity-60' : (PRIORITY_BORDER[task.priority] || 'border-white/5')
                  }`}
                >
                  <div className={`w-1 h-8 rounded-full shrink-0 ${
                    task.completed ? 'bg-green-400' : (PRIORITY_BAR[task.priority] || 'bg-white/20')
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-xs ${task.completed ? 'line-through text-muted' : 'text-white'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        task.priority === 'High' ? 'bg-red-400/10 text-red-400' :
                        task.priority === 'Medium' ? 'bg-primary/10 text-primary' :
                        'bg-blue-400/10 text-blue-400'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[9px] text-muted">{task.category}</span>
                      {task.subtasks?.length > 0 && (
                        <span className="text-[9px] text-muted">
                          {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                  </div>
                  {task.completed && (
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted">
                <span className="material-symbols-outlined text-3xl mb-1.5 block opacity-20">event_available</span>
                <p className="text-xs">No tasks for this day</p>
                <button
                  onClick={() => setScreen(Screen.QUICK_ADD)}
                  className="mt-2 text-primary text-[10px] font-bold hover:underline"
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
