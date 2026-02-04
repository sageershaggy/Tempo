import React, { useState, useMemo, useCallback } from 'react';
import { Screen, Task, Subtask, GlobalProps } from '../types';
import { suggestSubtasks, analyzeTaskPriority } from '../services/geminiService';
import { configManager } from '../config';
import { googleTasksService } from '../services/googleTasks';

export const TasksScreen: React.FC<GlobalProps> = ({ setScreen, tasks, setTasks }) => {
    // Get milestones from config
    const milestones = configManager.getConfig().social.mockMilestones;
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<string>('All');
    const [sort, setSort] = useState<'Manual' | 'Date' | 'Priority' | 'Title'>('Manual');
    const [loadingAI, setLoadingAI] = useState<string | null>(null);
    const [analyzingPriority, setAnalyzingPriority] = useState<string | null>(null);
    const [prioritySuggestion, setPrioritySuggestion] = useState<{ taskId: string, suggestion: 'High' | 'Medium' | 'Low' } | null>(null);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Bulk Select State
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [syncInterval, setSyncInterval] = useState<string>('10');
    const [lastAutoSync, setLastAutoSync] = useState<number | null>(googleTasksService.getLastSyncTime());
    const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    // Auto-sync callback
    const performAutoSync = useCallback(async () => {
        if (!googleTasksService.isConnected()) return;
        if (autoSyncStatus === 'syncing') return; // prevent overlapping syncs

        try {
            setAutoSyncStatus('syncing');
            console.log('[Tempo] Auto-sync triggered at', new Date().toLocaleTimeString());
            const result = await googleTasksService.syncBidirectional(tasks);

            // Merge pulled tasks that don't already exist
            const existingTitles = new Set(tasks.map(t => t.title));
            const newTasks = result.pulled.filter(t => !existingTitles.has(t.title));
            if (newTasks.length > 0) {
                setTasks(prev => [...prev, ...newTasks]);
            }

            setLastAutoSync(Date.now());
            setAutoSyncStatus('success');
            console.log('[Tempo] Auto-sync complete:', result.pushed, `| ${newTasks.length} new tasks pulled`);

            // Reset status indicator after 3 seconds
            setTimeout(() => setAutoSyncStatus('idle'), 3000);
        } catch (err) {
            console.error('[Tempo] Auto-sync failed:', err);
            setAutoSyncStatus('error');
            setTimeout(() => setAutoSyncStatus('idle'), 5000);
        }
    }, [tasks, setTasks, autoSyncStatus]);

    // Auto-sync interval effect
    React.useEffect(() => {
        if (syncInterval === 'Off') return;
        const minutes = parseInt(syncInterval);
        if (isNaN(minutes)) return;

        // Trigger an initial sync when interval is first set/changed
        const initialTimeout = setTimeout(() => {
            performAutoSync();
        }, 2000); // small delay to avoid sync on every re-render

        const interval = setInterval(() => {
            performAutoSync();
        }, minutes * 60000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [syncInterval, performAutoSync]);

    // --- Derived State: Categories ---
    const categories = useMemo(() => {
        const configCats = configManager.getConfig().categories.task || [];
        const taskCats = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)));
        return Array.from(new Set([...configCats, ...taskCats]));
    }, [tasks]);

    // --- Filtering & Sorting Logic ---
    const filteredTasks = useMemo(() => {
        let result = tasks.filter(t => {
            if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
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

        if (sort === 'Manual') return result;

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

    const toggleTaskSelection = (id: string) => {
        const newSet = new Set(selectedTaskIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedTaskIds(newSet);
    };

    const handleBulkComplete = () => {
        setTasks(prev => prev.map(t => selectedTaskIds.has(t.id) ? { ...t, completed: true } : t));
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
    };

    const handleBulkDelete = () => {
        setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        if (sort !== 'Manual' || searchQuery || isSelectionMode) return;
        setDraggedTaskId(id);
        e.dataTransfer.effectAllowed = 'move';
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
        if (isSelectionMode) {
            toggleTaskSelection(id);
        } else {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
        }
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

    const handleAnalyzePriority = async (task: Task) => {
        setAnalyzingPriority(task.id);
        setPrioritySuggestion(null);
        try {
            const suggestion = await analyzeTaskPriority(task);
            setPrioritySuggestion({ taskId: task.id, suggestion });
        } finally {
            setAnalyzingPriority(null);
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
        switch (p) {
            case 'High': return 'text-secondary border-secondary/30 bg-secondary/10';
            case 'Medium': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
            case 'Low': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            default: return 'text-muted border-white/10 bg-white/5';
        }
    };

    const formatDateDisplay = (dateStr?: string) => {
        if (!dateStr) return 'Set Date';
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `Today, ${timeStr}`;
        if (isTomorrow) return `Tomorrow, ${timeStr}`;
        return `${date.getMonth() + 1}/${date.getDate()}, ${timeStr}`;
    };

    return (
        <div className="h-full flex flex-col bg-background-dark pb-24 relative">
            {/* Header */}
            <div className="pt-12 pb-4 px-6 bg-gradient-to-b from-background-dark to-transparent sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold">My Tasks</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setScreen(Screen.AUDIO)}
                            className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center hover:bg-surface-light/80 text-white transition-colors"
                            title="Focus Audio"
                        >
                            <span className="material-symbols-outlined text-lg">headphones</span>
                        </button>
                        <button
                            onClick={() => setScreen(Screen.INTEGRATIONS)}
                            className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center hover:bg-surface-light/80 text-white transition-colors"
                            title="Integrations (Sync)"
                        >
                            <span className="material-symbols-outlined text-lg">sync</span>
                        </button>
                        {/* Sync Interval Selector */}
                        <div className="relative group">
                            <button
                                onClick={() => setSyncInterval(prev => {
                                    const next = { 'Off': '10', '10': '20', '20': '30', '30': 'Off' };
                                    return next[prev as keyof typeof next] || 'Off';
                                })}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                    autoSyncStatus === 'syncing' ? 'bg-blue-500/30 text-blue-400 animate-pulse' :
                                    autoSyncStatus === 'success' ? 'bg-green-500/30 text-green-400' :
                                    autoSyncStatus === 'error' ? 'bg-red-500/30 text-red-400' :
                                    'bg-surface-light hover:bg-surface-light/80 text-white'
                                }`}
                                title={`Sync Interval: ${syncInterval === 'Off' ? 'Manual' : syncInterval + 'm'}${lastAutoSync ? ` | Last: ${new Date(lastAutoSync).toLocaleTimeString()}` : ''}`}
                            >
                                <div className="flex flex-col items-center leading-none">
                                    <span className="text-[9px] font-bold uppercase text-muted mb-[1px]">
                                        {autoSyncStatus === 'syncing' ? '⟳' : 'Sync'}
                                    </span>
                                    <span className="text-[10px] font-bold">{syncInterval === 'Off' ? 'Off' : `${syncInterval}m`}</span>
                                </div>
                            </button>
                        </div>
                        <button
                            onClick={() => setScreen(Screen.CALENDAR)}
                            className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center hover:bg-surface-light/80 text-white transition-colors"
                            title="Calendar View"
                        >
                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedTaskIds(new Set());
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSelectionMode ? 'bg-white text-black' : 'bg-surface-light text-white'}`}
                        >
                            <span className="material-symbols-outlined text-sm">checklist_rtl</span>
                        </button>
                        <button onClick={() => setScreen(Screen.QUICK_ADD)} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary-light shadow-lg transition-colors">
                            <span className="material-symbols-outlined text-white">add</span>
                        </button>
                    </div>
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
                    <button onClick={() => setScreen(Screen.MILESTONES)} className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 transition-colors hover:bg-blue-500/20">
                        <span className="material-symbols-outlined text-[14px]">flag</span> Milestones
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1 shrink-0"></div>
                    {['All', 'High', 'Overdue', 'Completed', ...categories].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filter === f
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent text-muted border-white/10 hover:border-white/30'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-8">
                {/* Completed tab header */}
                {filter === 'Completed' && (
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                            <span className="text-sm font-bold text-white">{filteredTasks.length} Completed</span>
                        </div>
                        {filteredTasks.length > 0 && (
                            <button
                                onClick={() => setTasks(prev => prev.filter(t => !t.completed))}
                                className="text-[10px] font-bold text-red-400/70 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                )}

                {filteredTasks.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center">
                        <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-muted">{filter === 'Completed' ? 'task_alt' : 'filter_list_off'}</span>
                        </div>
                        <p className="text-white font-bold text-lg">{filter === 'Completed' ? 'No completed tasks yet' : 'No tasks found'}</p>
                        <button onClick={() => setFilter('All')} className="text-primary text-sm font-bold mt-2 hover:underline">{filter === 'Completed' ? 'Back to All' : 'Clear Filters'}</button>
                    </div>
                ) : (
                    filteredTasks.map(task => {
                        const overdue = isOverdue(task.dueDate) && !task.completed;
                        const expanded = expandedTask === task.id;
                        const subtaskProgress = task.subtasks.length > 0
                            ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100
                            : 0;
                        const isSelected = selectedTaskIds.has(task.id);
                        const linkedMilestone = milestones.find(m => m.id === task.milestoneId);

                        return (
                            <div
                                key={task.id}
                                draggable={sort === 'Manual' && !searchQuery && !isSelectionMode}
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onDragOver={(e) => handleDragOver(e, task.id)}
                                className={`bg-surface-dark rounded-xl border overflow-hidden transition-all duration-300 relative ${isSelected ? 'border-primary bg-primary/5' : 'border-white/5'
                                    } ${draggedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100'}`}
                            >
                                {/* Main Task Row */}
                                <div className="relative">
                                    {task.subtasks.length > 0 && !isSelected && (
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                                                style={{ width: `${subtaskProgress}%` }}
                                            ></div>
                                        </div>
                                    )}

                                    <div className="p-4 flex gap-4">
                                        {/* Selection Checkbox or Drag Handle */}
                                        {isSelectionMode ? (
                                            <div
                                                onClick={() => toggleTaskSelection(task.id)}
                                                className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted'}`}
                                            >
                                                {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleTask(task.id)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${task.completed ? 'bg-primary border-primary' : 'border-muted hover:border-primary'
                                                    }`}
                                            >
                                                {task.completed && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                            </button>
                                        )}

                                        <div className="flex-1 min-w-0" onClick={() => !isSelectionMode && setExpandedTask(expanded ? null : task.id)}>
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`text-sm font-medium break-words leading-tight pr-2 ${task.completed ? 'line-through text-muted' : 'text-white'}`}>
                                                    {task.title}
                                                </h3>
                                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                                    {task.priority === 'High' && <span className="material-symbols-outlined text-[10px]">priority_high</span>}
                                                    {task.priority}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Date Picker */}
                                                <div
                                                    className="relative z-20"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <label className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${overdue && !task.completed
                                                        ? 'border-secondary/50 text-secondary bg-secondary/10'
                                                        : 'border-white/10 text-muted hover:text-white bg-white/5 hover:bg-white/10'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                                        <span className={`text-xs font-bold whitespace-nowrap ${!task.dueDate && 'text-muted/70'}`}>
                                                            {formatDateDisplay(task.dueDate)}
                                                        </span>
                                                        <input
                                                            type="datetime-local"
                                                            value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}
                                                            onChange={(e) => {
                                                                if (!e.target.value) return;
                                                                const d = new Date(e.target.value);
                                                                if (!isNaN(d.getTime())) {
                                                                    handleUpdateTask(task.id, { dueDate: d.toISOString() });
                                                                }
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                (e.target as HTMLInputElement).showPicker?.();
                                                            }}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [color-scheme:dark]"
                                                            tabIndex={-1}
                                                        />
                                                    </label>
                                                </div>

                                                {/* Category Selector */}
                                                <div
                                                    className="relative z-20"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <select
                                                        value={task.category || ''}
                                                        onChange={(e) => handleUpdateTask(task.id, { category: e.target.value })}
                                                        className="appearance-none bg-white/5 border border-white/10 text-[10px] font-bold text-muted hover:text-white rounded-lg pl-3 pr-6 py-1.5 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer w-full"
                                                    >
                                                        <option value="">No Category</option>
                                                        {categories.map(c => (
                                                            <option key={c} value={c} className="bg-surface-dark text-white">{c}</option>
                                                        ))}
                                                    </select>
                                                    <span className="material-symbols-outlined text-[12px] text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expanded && !isSelectionMode && (
                                        <div className="bg-black/20 border-t border-white/5 p-4 transition-all">
                                            <div className="mb-6 grid gap-4 animate-fade-in">

                                                {/* Milestone Display */}
                                                {linkedMilestone && (
                                                    <div className="bg-surface-light border border-white/5 rounded-lg p-3">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-bold text-white flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm text-secondary">flag</span> {linkedMilestone.title}
                                                            </span>
                                                            <span className="text-[10px] text-muted font-bold">{linkedMilestone.progress}% Complete</span>
                                                        </div>
                                                        <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full ${linkedMilestone.color}`} style={{ width: `${linkedMilestone.progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Milestone & Priority Selectors */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-muted block mb-1">Milestone Link</label>
                                                        <div className="relative">
                                                            <select
                                                                value={task.milestoneId || ''}
                                                                onChange={(e) => handleUpdateTask(task.id, { milestoneId: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-primary/50 focus:outline-none appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                                                            >
                                                                <option value="">No Milestone</option>
                                                                {milestones.map(m => (
                                                                    <option key={m.id} value={m.id}>{m.title}</option>
                                                                ))}
                                                            </select>
                                                            <span className="material-symbols-outlined absolute right-2 top-2 text-xs text-muted pointer-events-none">expand_more</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-muted block mb-1">Priority AI</label>
                                                        <div className="flex gap-2 items-center">
                                                            <select
                                                                value={task.priority}
                                                                onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value as any })}
                                                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-primary/50 focus:outline-none cursor-pointer hover:bg-white/10 transition-colors"
                                                            >
                                                                <option value="High">High</option>
                                                                <option value="Medium">Medium</option>
                                                                <option value="Low">Low</option>
                                                            </select>
                                                            <button
                                                                onClick={() => handleAnalyzePriority(task)}
                                                                className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center hover:bg-primary/40 text-primary border border-primary/30 transition-colors"
                                                                title="Suggest Priority"
                                                            >
                                                                <span className={`material-symbols-outlined text-sm ${analyzingPriority === task.id ? 'animate-spin' : ''}`}>auto_awesome</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* AI Priority Suggestion Result */}
                                                {prioritySuggestion && prioritySuggestion.taskId === task.id && (
                                                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-2 rounded border border-primary/20 flex items-center justify-between animate-fade-in">
                                                        <span className="text-xs text-white">AI suggests: <span className="font-bold text-primary">{prioritySuggestion.suggestion}</span></span>
                                                        <button
                                                            onClick={() => {
                                                                handleUpdateTask(task.id, { priority: prioritySuggestion.suggestion });
                                                                setPrioritySuggestion(null);
                                                            }}
                                                            className="text-[10px] bg-primary text-white px-2 py-1 rounded font-bold hover:bg-primary-light transition-colors"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Reminder & Snooze Section */}
                                                {task.dueDate && (
                                                    <div className="bg-surface-light border border-white/5 rounded-lg p-3">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-orange-400 text-lg">notifications_active</span>
                                                                <span className="text-xs font-bold text-white">Due Date Reminder</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdateTask(task.id, { reminderEnabled: !task.reminderEnabled })}
                                                                className={`relative w-10 h-5 rounded-full transition-colors ${task.reminderEnabled ? 'bg-primary' : 'bg-white/10'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${task.reminderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                            </button>
                                                        </div>
                                                        {task.reminderEnabled && (
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] text-muted">
                                                                    You'll be notified when this task is due or overdue.
                                                                </p>
                                                                {task.snoozedUntil && new Date(task.snoozedUntil) > new Date() && (
                                                                    <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                                                                        <span className="text-[10px] text-orange-400 flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-xs">snooze</span>
                                                                            Snoozed until {new Date(task.snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handleUpdateTask(task.id, { snoozedUntil: undefined })}
                                                                            className="text-[10px] text-orange-400 hover:text-orange-300 font-bold"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const snoozeUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                                                                            handleUpdateTask(task.id, { snoozedUntil: snoozeUntil });
                                                                        }}
                                                                        className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-muted hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xs">snooze</span>
                                                                        15 min
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const snoozeUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                                                                            handleUpdateTask(task.id, { snoozedUntil: snoozeUntil });
                                                                        }}
                                                                        className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-muted hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xs">snooze</span>
                                                                        1 hour
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const tomorrow = new Date();
                                                                            tomorrow.setDate(tomorrow.getDate() + 1);
                                                                            tomorrow.setHours(9, 0, 0, 0);
                                                                            handleUpdateTask(task.id, { snoozedUntil: tomorrow.toISOString() });
                                                                        }}
                                                                        className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-muted hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xs">snooze</span>
                                                                        Tomorrow
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-muted block mb-1">Notes</label>
                                                    <textarea
                                                        value={task.notes || ''}
                                                        onChange={(e) => handleUpdateTask(task.id, { notes: e.target.value })}
                                                        placeholder="Add detailed notes here..."
                                                        className="w-full bg-white/5 border border-white/10 rounded p-3 text-xs text-white min-h-[80px] focus:border-primary/50 focus:outline-none resize-none leading-relaxed hover:bg-white/10 transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            {/* Subtasks */}
                                            <div className="space-y-2 mb-4">
                                                {task.subtasks.map(st => (
                                                    <div key={st.id} className="flex items-center gap-3 pl-2 group/sub">
                                                        <button
                                                            onClick={() => handleToggleSubtask(task.id, st.id)}
                                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${st.completed ? 'bg-white/40 border-transparent' : 'border-white/20 hover:border-white/50'}`}
                                                        >
                                                            {st.completed && <span className="material-symbols-outlined text-black text-[10px] font-bold">check</span>}
                                                        </button>
                                                        <span className={`text-sm flex-1 transition-colors ${st.completed ? 'text-muted line-through' : 'text-gray-300'}`}>{st.title}</span>
                                                    </div>
                                                ))}
                                            </div>

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

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleGenerateSubtasks(task.id, task.title)}
                                                    disabled={loadingAI === task.id}
                                                    className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center gap-2 text-xs font-bold text-primary-light hover:bg-primary/20 transition-colors"
                                                >
                                                    <span className={`material-symbols-outlined text-sm ${loadingAI === task.id ? 'animate-spin' : ''}`}>
                                                        {loadingAI === task.id ? 'sync' : 'auto_awesome'}
                                                    </span>
                                                    AI Subtasks
                                                </button>
                                                <button
                                                    onClick={() => setScreen(Screen.TIMER)}
                                                    className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                                                    Start Timer
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Simple Expansion Chevron */}
                                    {!expanded && !isSelectionMode && task.subtasks.length > 0 && (
                                        <div
                                            className="bg-black/20 border-t border-white/5 py-1 flex justify-center cursor-pointer hover:bg-white/5 transition-colors"
                                            onClick={() => setExpandedTask(task.id)}
                                        >
                                            <span className="material-symbols-outlined text-muted text-sm">expand_more</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Completed count hint when on All tab */}
            {filter === 'All' && tasks.filter(t => t.completed).length > 0 && (
                <div className="px-4 pb-4">
                    <button
                        onClick={() => setFilter('Completed')}
                        className="w-full py-2.5 rounded-xl bg-surface-dark/50 border border-white/5 flex items-center justify-center gap-2 text-muted hover:text-white hover:border-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm text-green-400">check_circle</span>
                        <span className="text-xs font-bold">{tasks.filter(t => t.completed).length} completed tasks</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                    </button>
                </div>
            )}

            {/* Floating Action Button */}
            {
                !isSelectionMode && (
                    <div className="absolute bottom-24 right-6 z-30">
                        <button onClick={() => setScreen(Screen.QUICK_ADD)} className="w-14 h-14 bg-secondary rounded-full shadow-[0_4px_20px_-5px_rgba(255,107,107,0.5)] flex items-center justify-center hover:scale-110 transition-transform active:scale-95 text-white">
                            <span className="material-symbols-outlined text-3xl">add</span>
                        </button>
                    </div>
                )
            }

            {/* Bulk Action Bar */}
            {
                isSelectionMode && selectedTaskIds.size > 0 && (
                    <div className="absolute bottom-24 left-4 right-4 bg-surface-light border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center justify-between z-40 animate-slide-up">
                        <span className="text-sm font-bold px-2">{selectedTaskIds.size} selected</span>
                        <div className="flex gap-2">
                            <button onClick={handleBulkComplete} className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold border border-green-500/30 hover:bg-green-500/30 transition-colors">Complete</button>
                            <button onClick={handleBulkDelete} className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/30 hover:bg-red-500/30 transition-colors">Delete</button>
                        </div>
                    </div>
                )
            }
        </div>
    );
};