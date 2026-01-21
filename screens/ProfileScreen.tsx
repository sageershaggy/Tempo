import React from 'react';
import { Screen } from '../types';

export const ProfileScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
        <h2 className="font-bold text-lg">Profile & Sync</h2>
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">settings</span></button>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-5 mb-8">
            <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary p-1">
                    <img src="https://picsum.photos/id/64/200/200" className="w-full h-full rounded-full object-cover border-4 border-background-dark" alt="Profile" />
                </div>
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-background-dark rounded-full"></div>
            </div>
            <div>
                <h3 className="text-2xl font-bold">Alex Morgan</h3>
                <p className="text-sm text-muted mb-2">alex.morgan@tempo.app</p>
                <span className="bg-primary/20 text-primary-light border border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Pro Member</span>
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Sync & Storage</h4>
                <div className="bg-surface-dark rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#202124] flex items-center justify-center border border-white/10 shadow-inner">
                                <span className="material-symbols-outlined text-white">sync</span>
                            </div>
                            <div>
                                <div className="font-semibold">Sync with Chrome</div>
                                <div className="text-xs text-muted flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Last synced: Just now
                                </div>
                            </div>
                        </div>
                        <div className="w-12 h-7 bg-primary rounded-full relative cursor-pointer shadow-inner">
                            <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <span className="material-symbols-outlined text-muted">cloud</span> History Storage
                            </div>
                            <span className="text-xs font-bold text-primary">245 MB / 2 GB</span>
                        </div>
                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-secondary w-[12%] rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                 <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Support</h4>
                 <div className="bg-gradient-to-br from-surface-dark to-primary/10 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="relative z-10">
                        <h5 className="font-bold mb-1">Developer Feedback</h5>
                        <p className="text-xs text-muted mb-4">Have an idea? We read every message.</p>
                        <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                            <span className="material-symbols-outlined text-base">chat_bubble</span> Send Feedback
                        </button>
                    </div>
                 </div>
            </div>

            <div className="space-y-3">
                 <button className="w-full py-4 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">download</span> Export Data as CSV
                </button>
                <button onClick={() => setScreen(Screen.ADMIN)} className="w-full py-2 text-xs text-muted/30 hover:text-white uppercase font-bold tracking-widest">
                    Site Admin
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};