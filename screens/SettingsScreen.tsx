import React, { useState } from 'react';
import { Screen } from '../types';

export const SettingsScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [customDuration, setCustomDuration] = useState(42);
  const [tickSpeed, setTickSpeed] = useState(15);

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="text-muted hover:text-white"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="text-lg font-bold">Settings</h2>
        <button onClick={() => setScreen(Screen.TIMER)} className="text-primary font-bold text-sm">Done</button>
      </div>

      <div className="p-6 space-y-8">
        {/* Audio Link */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">equalizer</span>
                <h3 className="text-lg font-bold">Audio & Soundscapes</h3>
            </div>
            <div 
                onClick={() => setScreen(Screen.AUDIO)}
                className="bg-surface-dark rounded-xl p-5 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-surface-light/50 transition-colors"
            >
                <div>
                    <p className="font-bold text-white">Focus Soundscapes</p>
                    <p className="text-xs text-muted mt-1">Binaural beats, ambient noise & more</p>
                </div>
                <span className="material-symbols-outlined text-muted">chevron_right</span>
            </div>
        </section>

        {/* Focus Rhythm & Customization */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">timer</span>
                <h3 className="text-lg font-bold">Focus Rhythm</h3>
            </div>
            
            {/* Presets */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button className="relative p-4 bg-primary rounded-xl border-2 border-primary text-left shadow-lg transform hover:scale-[1.02] transition-transform">
                    <span className="material-symbols-outlined absolute top-3 right-3 text-white">check_circle</span>
                    <p className="text-xs font-bold text-white/80 mb-1">POMODORO</p>
                    <p className="text-2xl font-bold">25/5</p>
                    <p className="text-xs text-white/70">Classic interval</p>
                </button>
                <button className="p-4 bg-surface-dark rounded-xl border border-white/5 text-left hover:border-primary/50 transition-colors">
                    <p className="text-xs font-bold text-muted mb-1">DEEP WORK</p>
                    <p className="text-2xl font-bold">50/10</p>
                    <p className="text-xs text-muted">High intensity</p>
                </button>
            </div>

            {/* Custom Settings Card */}
            <div className="bg-surface-light rounded-xl p-6 border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-secondary">tune</span>
                    <h4 className="font-bold text-base">Custom Focus</h4>
                </div>
                
                <div className="space-y-6">
                    {/* Duration Input */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted">Duration</label>
                        <div className="flex items-center gap-2 bg-background-dark border border-white/10 rounded-lg px-3 py-2">
                            <input 
                                type="number" 
                                value={customDuration}
                                onChange={(e) => setCustomDuration(Number(e.target.value))}
                                className="w-12 bg-transparent text-right font-bold text-white outline-none"
                            />
                            <span className="text-sm text-muted font-bold">minutes</span>
                        </div>
                    </div>

                    {/* Timer Sound */}
                    <div className="space-y-2">
                         <label className="text-sm font-medium text-muted">Timer sound</label>
                         <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select className="w-full bg-background-dark border border-white/10 rounded-lg text-white text-sm py-2.5 px-3 appearance-none focus:border-primary outline-none">
                                    <option>Desk Clock</option>
                                    <option>Digital Beep</option>
                                    <option>Soft Bell</option>
                                    <option>None</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-2.5 text-muted pointer-events-none text-lg">expand_more</span>
                            </div>
                            <button className="px-3 bg-surface-dark border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/5 text-primary text-sm font-bold gap-1">
                                <span className="material-symbols-outlined text-lg">play_arrow</span>
                                Preview
                            </button>
                         </div>
                    </div>

                    {/* Speed / BPM */}
                    <div className="flex items-center justify-between">
                         <label className="text-sm font-medium text-muted">Speed</label>
                         <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={tickSpeed}
                                onChange={(e) => setTickSpeed(Number(e.target.value))}
                                className="w-16 bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-white outline-none"
                            />
                            <span className="text-sm text-muted">beats per minute</span>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Preferences */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">tune</span>
                <h3 className="text-lg font-bold">General</h3>
            </div>
            <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                <div className="flex items-center justify-between p-4">
                    <div>
                        <p className="font-medium">Block Distractions</p>
                        <p className="text-xs text-muted">Limit social media</p>
                    </div>
                    <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                </div>
                <div className="flex items-center justify-between p-4">
                    <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-xs text-muted">Always on</p>
                    </div>
                    <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};