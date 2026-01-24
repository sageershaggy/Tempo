import React, { useState } from 'react';
import { Screen, Task, GlobalProps } from '../types';
import { enhanceTaskDescription } from '../services/geminiService';
import { configManager } from '../config';
import { generateId } from '../config/constants';

export const QuickAddScreen: React.FC<GlobalProps> = ({ setScreen, setTasks, setCurrentTask }) => {
  // Load categories from config
  const config = configManager.getConfig();
  const CATEGORIES = config.categories.task;
  const defaultCategory = config.categories.defaultTaskCategory;

  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [startTimerAfter, setStartTimerAfter] = useState(true);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleMagicEnhance = async () => {
    if (!input.trim()) return;
    setIsEnhancing(true);
    try {
        const enhanced = await enhanceTaskDescription(input);
        setInput(enhanced);
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
      setScreen(Screen.TIMER);
    } else {
      setScreen(Screen.TASKS);
    }
  };

  return (
    <div className="h-[600px] w-full flex flex-col bg-background-dark relative">
        {/* Ambient Background */}
        <div className="absolute top-0 left-0 w-full h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4">
            <button onClick={() => setScreen(Screen.TASKS)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
            </button>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Quick Add</span>
            </div>
            <div className="w-10"></div>
        </div>

        {/* Input Area */}
        <div className="flex-1 flex flex-col justify-center px-6 relative z-10">
            <div className="space-y-6 mb-12">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="What are you working on?"
                    className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-white/20 focus:ring-0 p-0 text-center resize-none leading-tight caret-secondary focus:outline-none"
                    rows={2}
                    autoFocus
                />

                <div className="relative">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add details, subtasks, or links..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/30 focus:ring-1 focus:ring-primary/50 focus:outline-none resize-none leading-relaxed transition-all"
                        rows={3}
                    />
                    <div className="absolute right-3 bottom-3 text-[10px] font-bold text-muted uppercase">Notes</div>
                </div>
            </div>

            <div className="bg-surface-dark/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
                {/* AI Button */}
                {input.length > 3 && (
                     <button
                        onClick={handleMagicEnhance}
                        disabled={isEnhancing}
                        className="w-full mb-6 py-2 px-4 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center gap-2 text-sm font-bold text-white hover:brightness-125 transition-all"
                    >
                        <span className={`material-symbols-outlined text-lg ${isEnhancing ? 'animate-spin' : ''}`}>
                            {isEnhancing ? 'sync' : 'auto_awesome'}
                        </span>
                        {isEnhancing ? 'Enhancing...' : 'Magic Enhance'}
                    </button>
                )}

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase text-muted flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">sell</span> Project
                        </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                                    selectedCategory === cat
                                    ? 'bg-primary text-white shadow-[0_0_10px_rgba(127,19,236,0.4)]'
                                    : 'bg-white/5 text-muted hover:bg-white/10'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full mb-5"></div>

                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setStartTimerAfter(!startTimerAfter)}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                            <span className="material-symbols-outlined">timer</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">Start Timer</p>
                            <p className="text-xs text-muted">Begin immediately</p>
                        </div>
                    </div>
                    <div className={`w-12 h-7 rounded-full relative transition-colors ${startTimerAfter ? 'bg-secondary' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${startTimerAfter ? 'right-1' : 'left-1'}`}></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12">
            <button
                onClick={handleCreateTask}
                disabled={!input.trim()}
                className={`w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all ${
                    input.trim()
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
            >
                <span className="material-symbols-outlined">check_circle</span>
                CREATE TASK
            </button>
        </div>
    </div>
  );
};
