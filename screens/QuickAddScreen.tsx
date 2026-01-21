import React, { useState } from 'react';
import { Screen } from '../types';
import { enhanceTaskDescription } from '../services/geminiService';

export const QuickAddScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [input, setInput] = useState('');
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

  return (
    <div className="h-screen w-full flex flex-col bg-background-dark relative">
        {/* Ambient Background */}
        <div className="absolute top-0 left-0 w-full h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4">
            <button onClick={() => setScreen(Screen.TIMER)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
            </button>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Quick Add</span>
            </div>
            <div className="w-10"></div>
        </div>

        {/* Input Area */}
        <div className="flex-1 flex flex-col justify-center px-6 relative z-10">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What are you working on?"
                className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-white/20 focus:ring-0 p-0 text-center resize-none leading-tight caret-secondary mb-12"
                rows={2}
                autoFocus
            />

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
                        <span className="text-xs text-secondary font-bold cursor-pointer">Edit Tags</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <div className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-[0_0_10px_rgba(127,19,236,0.4)]">
                            Design System
                        </div>
                        <div className="px-3 py-1.5 bg-white/5 text-muted text-xs font-bold rounded-lg whitespace-nowrap">
                            Marketing
                        </div>
                        <div className="px-3 py-1.5 bg-white/5 text-muted text-xs font-bold rounded-lg whitespace-nowrap">
                            Development
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full mb-5"></div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                            <span className="material-symbols-outlined">timer</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">Start Timer</p>
                            <p className="text-xs text-muted">Begin immediately</p>
                        </div>
                    </div>
                    <div className="w-12 h-7 bg-white/10 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-5 h-5 bg-secondary rounded-full shadow-sm"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12">
            <button onClick={() => setScreen(Screen.TIMER)} className="w-full h-14 bg-white text-black rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-95 transition-all">
                <span className="material-symbols-outlined">check_circle</span>
                CREATE TASK
            </button>
        </div>
    </div>
  );
};