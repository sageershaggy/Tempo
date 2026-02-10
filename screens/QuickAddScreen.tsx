import React, { useState } from 'react';
import { Screen, Task, GlobalProps } from '../types';
import { configManager } from '../config';
import { generateId } from '../config/constants';

export const QuickAddScreen: React.FC<GlobalProps> = ({ setScreen, setTasks, setCurrentTask }) => {
  const config = configManager.getConfig();
  const CATEGORIES = config.categories.task;
  const defaultCategory = config.categories.defaultTaskCategory;

  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedPriority, setSelectedPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [startTimerAfter, setStartTimerAfter] = useState(true);

  const handleCreateTask = () => {
    if (!input.trim()) return;

    const newTask: Task = {
      id: generateId('task'),
      title: input.trim(),
      category: selectedCategory,
      priority: selectedPriority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      completed: false,
      subtasks: [],
      createdAt: Date.now(),
      notes: notes.trim() || undefined,
    };

    setTasks(prev => [newTask, ...prev]);
    setCurrentTask(newTask);

    if (startTimerAfter) {
      localStorage.setItem('tempo_autoStartTimer', 'true');
      setScreen(Screen.TIMER);
    } else {
      setScreen(Screen.TASKS);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background-dark">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
        <button onClick={() => setScreen(Screen.TASKS)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-muted hover:text-white transition-all">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
        <span className="text-sm font-bold">New Task</span>
        <div className="w-8"></div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
        {/* Task Title */}
        <div>
          <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Task</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What are you working on?"
            className="w-full bg-surface-dark border border-white/10 rounded-lg px-3.5 py-2.5 text-base font-semibold text-white placeholder-white/20 focus:border-primary focus:outline-none"
            autoFocus
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add details, subtasks, or links..."
            className="w-full bg-surface-dark border border-white/10 rounded-lg p-3.5 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none leading-relaxed"
            rows={3}
          />
        </div>

        {/* AI Enhance - Coming Soon */}
        {input.length > 3 && (
          <div>
            <button
              disabled
              className="w-full py-2 px-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center gap-2 text-sm font-semibold text-primary/50 cursor-not-allowed opacity-60"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Magic Enhance
              <span className="text-[9px] bg-primary/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Coming Soon</span>
            </button>
          </div>
        )}

        {/* Due Date & Priority Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Due Date Picker */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Due Date</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3.5 py-3 text-sm font-semibold text-white focus:border-primary focus:outline-none cursor-pointer datetime-input"
              />
              {dueDate && (
                <button
                  onClick={() => setDueDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                >
                  <span className="material-symbols-outlined text-[12px] text-muted">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Priority Dropdown */}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Priority</label>
            <div className="relative">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                className="w-full appearance-none bg-surface-dark border border-white/10 rounded-lg px-3.5 py-3 text-sm font-semibold text-white focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="High" className="bg-background-dark text-white">High</option>
                <option value="Medium" className="bg-background-dark text-white">Medium</option>
                <option value="Low" className="bg-background-dark text-white">Low</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="material-symbols-outlined text-muted text-sm">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Category Dropdown */}
        <div>
          <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Project</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-surface-dark border border-white/10 rounded-lg px-3.5 py-3 text-sm font-semibold text-white focus:border-primary focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-background-dark text-white">
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="material-symbols-outlined text-muted text-sm">expand_more</span>
            </div>
          </div>
        </div>

        {/* Start Timer Toggle */}
        <div
          className="flex items-center justify-between p-3.5 bg-surface-dark rounded-xl border border-white/5 cursor-pointer hover:bg-white/[0.02] transition-colors"
          onClick={() => setStartTimerAfter(!startTimerAfter)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] text-secondary">timer</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Start Timer</p>
              <p className="text-[10px] text-muted">Begin immediately after creating</p>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${startTimerAfter ? 'bg-secondary' : 'bg-surface-light'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${startTimerAfter ? 'left-5' : 'left-1'}`}></div>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="px-5 py-4 border-t border-white/5 shrink-0">
        <button
          onClick={handleCreateTask}
          disabled={!input.trim()}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${input.trim()
              ? 'bg-primary text-white hover:bg-primary-light'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
        >
          <span className="material-symbols-outlined text-base">add_task</span>
          Create Task
        </button>
      </div>
    </div>
  );
};
