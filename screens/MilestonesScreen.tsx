import React, { useState, useEffect } from 'react';
import { Screen, Milestone } from '../types';
import { STORAGE_KEYS, generateId } from '../config/constants';

const MILESTONE_COLORS = [
    { label: 'Purple', value: 'bg-primary' },
    { label: 'Red', value: 'bg-secondary' },
    { label: 'Blue', value: 'bg-blue-500' },
    { label: 'Green', value: 'bg-green-500' },
    { label: 'Orange', value: 'bg-orange-500' },
    { label: 'Pink', value: 'bg-pink-500' },
];

// Load milestones from storage or use empty array
const loadMilestones = (): Milestone[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.USER_MILESTONES);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load milestones:', e);
    }
    return [];
};

const saveMilestones = (milestones: Milestone[]): void => {
    localStorage.setItem(STORAGE_KEYS.USER_MILESTONES, JSON.stringify(milestones));
};

export const MilestonesScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
    const [milestones, setMilestones] = useState<Milestone[]>(loadMilestones);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newColor, setNewColor] = useState('bg-primary');

    // Save milestones when they change
    useEffect(() => {
        saveMilestones(milestones);
    }, [milestones]);

    const handleCreateMilestone = () => {
        if (!newTitle.trim()) return;
        const milestone: Milestone = {
            id: generateId('milestone'),
            title: newTitle.trim(),
            dueDate: newDueDate ? new Date(newDueDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            color: newColor,
            progress: 0,
        };
        setMilestones(prev => [...prev, milestone]);
        setNewTitle('');
        setNewDueDate('');
        setNewColor('bg-primary');
        setShowCreateForm(false);
    };

    const handleDeleteMilestone = (id: string) => {
        setMilestones(prev => prev.filter(m => m.id !== id));
    };

    return (
        <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
                <button onClick={() => setScreen(Screen.TASKS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
                <h2 className="font-bold text-lg">Project Milestones</h2>
                <button onClick={() => setShowCreateForm(true)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">add</span></button>
            </div>

            <div className="p-6 space-y-6">
                {milestones.map((milestone) => (
                    <div key={milestone.id} className="relative group">
                        {/* Timeline Line */}
                        <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-white/10 group-last:hidden"></div>

                        <div className="flex gap-4">
                            {/* Icon/Status */}
                            <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-4 border-background-dark z-10 ${milestone.progress === 100 ? 'bg-green-500 text-black' : 'bg-surface-light text-muted'}`}>
                                {milestone.progress === 100 ? (
                                    <span className="material-symbols-outlined text-xl font-bold">check</span>
                                ) : (
                                    <span className="text-xs font-bold">{milestone.progress}%</span>
                                )}
                            </div>

                            {/* Card */}
                            <div className="flex-1 bg-surface-dark rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-base">{milestone.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded">
                                            {new Date(milestone.dueDate).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteMilestone(milestone.id)}
                                            className="w-6 h-6 rounded-full hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-[14px] text-red-400">close</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full bg-black/40 h-2 rounded-full mb-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${milestone.color} transition-all duration-1000`}
                                        style={{ width: `${milestone.progress}%` }}
                                    ></div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-surface-light border border-background-dark flex items-center justify-center text-[8px] text-muted">
                                                <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted font-medium ml-1">+ 2 tasks remaining</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Create New Prompt */}
                <div
                    className="flex gap-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setShowCreateForm(true)}
                >
                    <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-2 border-dashed border-muted/50 bg-transparent">
                        <span className="material-symbols-outlined text-muted">add</span>
                    </div>
                    <div className="flex-1 py-3">
                        <p className="text-sm font-bold text-muted">Create new milestone...</p>
                    </div>
                </div>
            </div>

            {/* Create Milestone Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateForm(false)}>
                    <div className="w-full max-w-sm bg-surface-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold">New Milestone</h3>
                            <button onClick={() => setShowCreateForm(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Milestone name..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-primary/50 outline-none"
                                    autoFocus
                                />
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Due Date</label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-primary/50 outline-none cursor-pointer [color-scheme:dark]"
                                />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1.5 block">Color</label>
                                <div className="flex gap-2">
                                    {MILESTONE_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setNewColor(c.value)}
                                            className={`w-8 h-8 rounded-full ${c.value} transition-all ${newColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-dark scale-110' : 'opacity-60 hover:opacity-100'}`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={handleCreateMilestone}
                                disabled={!newTitle.trim()}
                                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${newTitle.trim()
                                    ? 'bg-primary text-white hover:bg-primary-light'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">flag</span>
                                Create Milestone
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};