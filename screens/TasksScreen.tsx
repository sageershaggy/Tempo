import React, { useState, useMemo, useEffect } from 'react';
import { Screen, Task, Subtask } from '../types';
import { suggestSubtasks } from '../services/geminiService';

// Mock Initial Data
const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Review Q3 Financials',
    category: 'Finance',
    priority: 'High',
    dueDate: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), // Today 2 PM
    completed: false,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 50000,
    notes: 'Focus on the marketing budget variances.',
    subtasks: []
  },
  {
    id: '2',
    title: 'Call Architect',
    category: 'Project A',
    priority: 'Medium',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Tomorrow
    completed: false,
    createdAt: Date.now() - 200000,
    subtasks: [
        { id: 's1', title: 'Discuss blueprints', completed: false },
        { id: 's2', title: 'Confirm budget', completed: true }
    ]
  },
  {
    id: '3',
    title: 'Update Client Presentation',
    category: 'Design',
    priority: 'Low',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // Yesterday (Overdue)
    completed: false,
    createdAt: Date.now() - 300000,
    subtasks: []
  }
];

export const TasksScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [sort, setSort] = useState<'Manual' | 'Date' | 'Priority' | 'Title'>('Manual');
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // --- Derived State: Categories ---
  const categories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tasks]);

  // --- Filtering & Sorting Logic ---
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
        // Search Filter
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Category/Status Filter
        if (filter === 'All') return !t.completed;
        if (filter === 'Completed') return t.completed;
        if (filter === 'High') return t.priority === 'High' && !t.completed;
        if (filter === 'Overdue') {
            return !t.completed && t.dueDate && new Date(t.dueDate) < new Date();
        }
        if (categories.includes(filter)) {
            return !t.completed && t.category === filter;
        }
        return !t.completed;
    });

    if (sort === 'Manual') return result; // Return order as is (for drag & drop)

    return result.sort((a, b) => {
        if (sort === 'Date') {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return dateA - dateB;
        }
        if (sort === 'Priority') {
            const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
            return priorityMap[a.priority] - priorityMap[b.priority];
        }
        if (sort === 'Title') {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });
  }, [tasks, filter, sort, searchQuery, categories]);

  // --- Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (sort !== 'Manual' || searchQuery) return; // Disable drag if sorted or searching
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId || sort !== 'Manual') return;

    const originalList = [...tasks];
    const draggedIndex = originalList.findIndex(t => t.id === draggedTaskId);
    const targetIndex = originalList.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newList = [...originalList];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, removed);

    setTasks(newList);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        return {
            ...t,
            updatedAt: Date.now(),
            subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
    }));
  };

  const handleGenerateSubtasks = async (taskId: string, taskTitle: string) => {
    setLoadingAI(taskId);
    setExpandedTask(taskId);
    try {
        const suggestions = await suggestSubtasks(taskTitle);
        const newSubtasks: Subtask[] = suggestions.map((s, i) => ({
            id: `new-${Date.now()}-${i}`,
            title: s,
            completed: false
        }));

        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return { ...t, subtasks: [...t.subtasks, ...newSubtasks], updatedAt: Date.now() };
        }));
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingAI(null);
    }
  };

  const handleAddSubtask = (taskId: string, title: string) => {
     if (!title.trim()) return;
     const newSubtask: Subtask = { id: `manual-${Date.now()}`, title, completed: false };
     setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSubtask], updatedAt: Date.now() } : t));
  };

  const isOverdue = (dateStr?: string) => {
      if (!dateStr) return false;
      return new Date(dateStr) < new Date();
  };

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'High': return 'text-secondary border-secondary/30 bg-secondary/10';
          case 'Medium': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
          case 'Low': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
          default: return 'text-muted border-white/10 bg-white/5';
      }
  };

  // --- Render ---

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24">
       {/* Header */}
       <div className="pt-12 pb-4 px-6 bg-gradient-to-b from-background-dark to-transparent sticky top-0 z-20 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-2xl">bolt</span>
                    <span className="font-bold text-lg">Tempo</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                    <img src="https://picsum.photos/100/100" className="w-full h-full rounded-full object-cover border-2 border-background-dark" alt="Profile" />
                </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold">My Tasks</h1>
                 <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary-light shadow-lg shadow-primary/30 active:scale-95 transition-all" onClick={() => setScreen(Screen.QUICK_ADD)}>
                    <span className="material-symbols-outlined text-white">add</span>
                 </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">search</span>
                <input 
                    type="text" 
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted/50"
                />
            </div>

            {/* Filter & Sort Bar */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {['All', 'High', 'Overdue', 'Completed', ...categories].map((f) => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                            filter === f 
                            ? 'bg-white text-black border-white' 
                            : 'bg-transparent text-muted border-white/10 hover:border-white/30'
                        }`}
                    >
                        {f}
                    </button>
                ))}
                <div className="w-px h-6 bg-white/10 mx-1 shrink-0"></div>
                <button 
                    onClick={() => {
                        const modes: ('Manual' | 'Date' | 'Priority' | 'Title')[] = ['Manual', 'Date', 'Priority', 'Title'];
                        const next = modes[(modes.indexOf(sort) + 1) % modes.length];
                        setSort(next);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-light text-xs font-bold text-primary border border-primary/20 shrink-0"
                >
                    <span className="material-symbols-outlined text-sm">sort</span>
                    {sort}
                </button>
            </div>
       </div>

       <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-8">
            {filteredTasks.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl text-muted">filter_list_off</span>
                    </div>
                    <p className="text-white font-bold text-lg">No tasks found</p>
                    <p className="text-muted text-sm max-w-[200px] mt-1">Try adjusting your filters or search query to find what you're looking for.</p>
                     <button 
                        onClick={() => { setFilter('All'); setSearchQuery(''); }}
                        className="mt-6 text-primary font-bold text-sm hover:underline"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                filteredTasks.map(task => {
                    const overdue = isOverdue(task.dueDate) && !task.completed;
                    const expanded = expandedTask === task.id;
                    const subtaskProgress = task.subtasks.length > 0 
                        ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100 
                        : 0;

                    return (
                        <div 
                            key={task.id} 
                            draggable={sort === 'Manual' && !searchQuery}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragOver={(e) => handleDragOver(e, task.id)}
                            className={`bg-surface-dark rounded-xl border border-white/5 overflow-hidden transition-all duration-300 ${draggedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100'}`}
                        >
                            {/* Main Task Row */}
                            <div className="relative">
                                {/* Subtask Progress Bar (Top Border) */}
                                {task.subtasks.length > 0 && (
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" 
                                            style={{ width: `${subtaskProgress}%` }}
                                        ></div>
                                    </div>
                                )}

                                <div className="p-4 flex gap-4">
                                    {/* Drag Handle (Visible only in Manual sort) */}
                                    {sort === 'Manual' && !searchQuery && (
                                        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted hover:text-white">
                                            <span className="material-symbols-outlined text-lg">drag_indicator</span>
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => handleToggleTask(task.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                            task.completed ? 'bg-primary border-primary' : 'border-muted hover:border-primary'
                                        }`}
                                    >
                                        {task.completed && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                    </button>
                                    
                                    <div className="flex-1 min-w-0" onClick={() => setExpandedTask(expanded ? null : task.id)}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-base font-medium truncate pr-2 ${task.completed ? 'line-through text-muted' : 'text-white'}`}>
                                                {task.title}
                                            </h3>
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                                 {task.priority === 'High' && <span className="material-symbols-outlined text-[10px]">priority_high</span>}
                                                 {task.priority}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {/* Date Picker Display */}
                                            <div 
                                                className={`flex items-center gap-1 text-xs font-bold transition-colors ${overdue ? 'text-secondary' : 'text-muted hover:text-white'}`}
                                                onClick={(e) => e.stopPropagation()} 
                                            >
                                                <span className="material-symbols-outlined text-[14px]">event</span>
                                                <input 
                                                    type="datetime-local"
                                                    value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}
                                                    onChange={(e) => handleUpdateTask(task.id, { dueDate: new Date(e.target.value).toISOString() })}
                                                    className="bg-transparent border-none p-0 text-xs font-bold font-sans text-current focus:ring-0 cursor-pointer w-[110px]"
                                                />
                                            </div>

                                            {task.category && (
                                                <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded">
                                                    {task.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {(expanded || task.subtasks.length > 0) && (
                                <div className={`bg-black/20 border-t border-white/5 p-4 transition-all ${expanded ? 'block' : 'hidden'}`}>
                                    
                                    {/* Expanded Metadata */}
                                    {expanded && (
                                        <div className="mb-6 grid gap-4 animate-fade-in">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-muted block mb-1">Category</label>
                                                    <input 
                                                        type="text" 
                                                        value={task.category}
                                                        onChange={(e) => handleUpdateTask(task.id, { category: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary/50 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-muted block mb-1">Priority</label>
                                                    <select 
                                                        value={task.priority}
                                                        onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value as any })}
                                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary/50 focus:outline-none"
                                                    >
                                                        <option value="High">High</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="Low">Low</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Notes</label>
                                                <textarea 
                                                    value={task.notes || ''}
                                                    onChange={(e) => handleUpdateTask(task.id, { notes: e.target.value })}
                                                    placeholder="Add notes here..."
                                                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs text-white min-h-[60px] focus:border-primary/50 focus:outline-none resize-none"
                                                />
                                            </div>
                                            
                                            <div className="flex justify-between text-[10px] text-muted border-t border-white/5 pt-2">
                                                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                                                {task.updatedAt && <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Subtasks Section */}
                                    <div className="space-y-2 mb-4">
                                        {task.subtasks.map(st => (
                                            <div key={st.id} className="flex items-center gap-3 pl-2 group">
                                                <button 
                                                    onClick={() => handleToggleSubtask(task.id, st.id)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                        st.completed ? 'bg-white/40 border-transparent' : 'border-white/20 hover:border-white/40'
                                                    }`}
                                                >
                                                     {st.completed && <span className="material-symbols-outlined text-black text-[10px] font-bold">check</span>}
                                                </button>
                                                <span className={`text-sm flex-1 ${st.completed ? 'text-muted line-through' : 'text-gray-300'}`}>{st.title}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Subtask Input */}
                                    <div className="flex items-center gap-2 mb-4 pl-2">
                                        <span className="material-symbols-outlined text-muted text-sm">add</span>
                                        <input 
                                            type="text" 
                                            placeholder="Add a subtask..."
                                            className="bg-transparent border-none text-sm text-white placeholder-white/20 focus:ring-0 w-full p-0"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddSubtask(task.id, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* AI & Focus Buttons */}
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleGenerateSubtasks(task.id, task.title)}
                                            disabled={loadingAI === task.id}
                                            className="flex-1 py-2 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center gap-2 text-xs font-bold text-primary-light hover:bg-primary/20 transition-colors"
                                        >
                                            <span className={`material-symbols-outlined text-sm ${loadingAI === task.id ? 'animate-spin' : ''}`}>
                                                {loadingAI === task.id ? 'sync' : 'auto_awesome'}
                                            </span>
                                            {loadingAI === task.id ? 'Generating...' : 'AI Subtasks'}
                                        </button>
                                        
                                        <button 
                                            onClick={() => setScreen(Screen.TIMER)}
                                            className="flex-1 py-2 rounded-lg bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                                            Focus Now
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Simple Expansion Chevron */}
                            {!expanded && task.subtasks.length > 0 && (
                                <div 
                                    className="bg-black/20 border-t border-white/5 py-1 flex justify-center cursor-pointer hover:bg-white/5"
                                    onClick={() => setExpandedTask(task.id)}
                                >
                                     <span className="material-symbols-outlined text-muted text-sm">expand_more</span>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
       </div>

       {/* Floating Action Button - Reaffirmed as prominent */}
       <div className="absolute bottom-24 right-6 z-30">
            <button 
                onClick={() => setScreen(Screen.QUICK_ADD)} 
                className="w-14 h-14 bg-secondary rounded-full shadow-[0_4px_20px_-5px_rgba(255,107,107,0.5)] flex items-center justify-center hover:scale-110 transition-transform active:scale-95 text-white"
            >
                <span className="material-symbols-outlined text-3xl">add</span>
            </button>
       </div>
    </div>
  );
};