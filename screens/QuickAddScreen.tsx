import React, { useState } from 'react';
import { Screen, Task, GlobalProps } from '../types';
import { enhanceTaskDescription } from '../services/geminiService';
import { configManager } from '../config';
import { generateId } from '../config/constants';

export const QuickAddScreen: React.FC<GlobalProps> = ({ setScreen, setTasks, setCurrentTask }) => {
  const config = configManager.getConfig();
  const CATEGORIES = config.categories.task;
  const defaultCategory = config.categories.defaultTaskCategory;

  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [startTimerAfter, setStartTimerAfter] = useState(true);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');

  const handleMagicEnhance = async () => {
    if (!input.trim()) return;
    setIsEnhancing(true);
    setEnhanceError('');
    try {
      const enhanced = await enhanceTaskDescription(input);
      if (enhanced === input) {
        setEnhanceError('AI key not configured. Set VITE_GEMINI_API_KEY in your .env file.');
      } else {
        setInput(enhanced);
      }
    } catch {
      setEnhanceError('Enhancement failed. Check your API key.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCreateTask = () => {
    if (!input.trim()) return;

    const newTask: Task = {
      id: generateId('task'),
      title: input.trim(),
      category: selectedCategory,
      priority: 'Medium',
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
            onChange={(e) => { setInput(e.target.value); setEnhanceError(''); }}
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

        {/* AI Enhance */}
        {input.length > 3 && (
          <div>
            <button
              onClick={handleMagicEnhance}
              disabled={isEnhancing}
              className="w-full py-2 px-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:bg-primary/15 transition-all disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${isEnhancing ? 'animate-spin' : ''}`}>
                {isEnhancing ? 'sync' : 'auto_awesome'}
              </span>
              {isEnhancing ? 'Enhancing...' : 'Magic Enhance'}
            </button>
            {enhanceError && (
              <p className="text-[10px] text-amber-400 mt-1.5 text-center">{enhanceError}</p>
            )}
          </div>
        )}

        {/* Project Category */}
        <div>
          <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Project</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface-dark text-muted border border-white/10 hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
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
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
            input.trim()
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
