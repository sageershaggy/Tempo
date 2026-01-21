import React from 'react';
import { Screen } from '../types';

export const StatsScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
       <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <button className="p-2 -ml-2 rounded-full hover:bg-white/5"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
            <h2 className="text-lg font-bold">Weekly Report</h2>
            <button className="p-2 -mr-2 rounded-full hover:bg-white/5"><span className="material-symbols-outlined">more_horiz</span></button>
       </div>

       <div className="flex justify-center py-4">
            <button className="flex items-center gap-2 bg-primary/20 text-primary-light px-4 py-2 rounded-full text-sm font-bold border border-primary/30">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Oct 10 - Oct 17
                <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
       </div>

       <div className="px-6 py-2">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Weekly Focus</h3>
                    <p className="text-4xl font-black mt-1">32<span className="text-2xl text-muted font-medium">h</span> 45<span className="text-2xl text-muted font-medium">m</span></p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-48 flex items-end justify-between gap-2 mb-8">
                {[
                    { d: 'M', h: '20%', t: '1h 12m' },
                    { d: 'T', h: '65%', t: '4h 30m' },
                    { d: 'W', h: '90%', t: '6h 15m', active: true },
                    { d: 'T', h: '45%', t: '3h 10m' },
                    { d: 'F', h: '75%', t: '5h 20m' },
                    { d: 'S', h: '30%', t: '2h 05m' },
                    { d: 'S', h: '5%', t: '0h 15m' }
                ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                        <div className="w-full relative rounded-t-lg overflow-hidden bg-surface-light group-hover:bg-surface-light/80 transition-all h-full">
                            <div 
                                className={`absolute bottom-0 w-full rounded-t-lg transition-all ${bar.active ? 'bg-gradient-to-t from-primary to-secondary shadow-[0_0_15px_rgba(127,19,236,0.5)]' : 'bg-surface-light group-hover:bg-primary/50'}`} 
                                style={{ height: bar.h }}
                            ></div>
                        </div>
                        <span className={`text-xs font-bold ${bar.active ? 'text-primary' : 'text-muted'}`}>{bar.d}</span>
                    </div>
                ))}
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-secondary bg-secondary/10 p-1.5 rounded-full text-sm">local_fire_department</span>
                        <span className="text-xs font-bold uppercase text-muted">Best Day</span>
                    </div>
                    <p className="text-lg font-bold">Wednesday</p>
                    <p className="text-xs text-secondary font-bold mt-1">+12% vs last week</p>
                </div>
                <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-full text-sm">avg_time</span>
                        <span className="text-xs font-bold uppercase text-muted">Avg/Day</span>
                    </div>
                    <p className="text-lg font-bold">4h 30m</p>
                    <p className="text-xs text-primary font-bold mt-1">Consistent</p>
                </div>
            </div>

            {/* Top Projects */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Top Focus Projects</h3>
                    <button className="text-primary text-sm font-bold flex items-center">See All <span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="bg-surface-dark p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                <span className="material-symbols-outlined">code</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm">Website Redesign</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    <p className="text-xs text-muted">Development</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-sm">12h 15m</p>
                            <div className="w-16 h-1.5 bg-surface-light rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-indigo-500 w-3/4 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};