import React from 'react';
import { Screen } from '../types';

export const SettingsScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="text-muted hover:text-white"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="text-lg font-bold">Settings</h2>
        <button onClick={() => setScreen(Screen.TIMER)} className="text-primary font-bold text-sm">Done</button>
      </div>

      <div className="p-6 space-y-8">
        {/* Audio Mixer */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">equalizer</span>
                <h3 className="text-lg font-bold">Audio Mixer</h3>
            </div>
            <div className="bg-surface-dark rounded-xl p-5 space-y-6 border border-white/5">
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted">Master Volume</span>
                        <span className="text-xs font-bold text-secondary">85%</span>
                    </div>
                    <input type="range" className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary" defaultValue={85} />
                </div>
                
                <div className="space-y-2">
                    <span className="text-sm font-medium text-muted">Soundscape</span>
                    <div className="relative">
                        <select className="w-full bg-surface-light border-none rounded-lg text-white text-sm py-3 px-4 appearance-none focus:ring-1 focus:ring-primary">
                            <option>Heavy Rain</option>
                            <option>Coffee Shop</option>
                            <option>White Noise</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 text-primary pointer-events-none">expand_more</span>
                    </div>
                </div>
            </div>
        </section>

        {/* Focus Rhythm */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">timer</span>
                <h3 className="text-lg font-bold">Focus Rhythm</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
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