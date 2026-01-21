import React, { useState } from 'react';
import { Screen, Milestone } from '../types';

// Mock Data
const INITIAL_MILESTONES: Milestone[] = [
    { id: 'm1', title: 'Launch MVP Beta', dueDate: '2023-11-15', color: 'bg-primary', progress: 75 },
    { id: 'm2', title: 'Complete User Research', dueDate: '2023-10-30', color: 'bg-secondary', progress: 100 },
    { id: 'm3', title: 'Design System v2', dueDate: '2023-12-01', color: 'bg-blue-500', progress: 30 },
];

export const MilestonesScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
    const [milestones] = useState<Milestone[]>(INITIAL_MILESTONES);

    return (
        <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
                <button onClick={() => setScreen(Screen.TASKS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
                <h2 className="font-bold text-lg">Project Milestones</h2>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">add</span></button>
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
                                    <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded">
                                        {new Date(milestone.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div className="w-full bg-black/40 h-2 rounded-full mb-3 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${milestone.color} transition-all duration-1000`} 
                                        style={{ width: `${milestone.progress}%` }}
                                    ></div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Mock Linked Tasks */}
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
                <div className="flex gap-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-2 border-dashed border-muted/50 bg-transparent">
                        <span className="material-symbols-outlined text-muted">add</span>
                    </div>
                    <div className="flex-1 py-3">
                        <p className="text-sm font-bold text-muted">Create new milestone...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};