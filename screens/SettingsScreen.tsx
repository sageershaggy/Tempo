import React, { useState } from 'react';
import { Screen, GlobalProps } from '../types';

export const SettingsScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState, isPro }) => {
  // Timer Settings
  const [pomodoroFocus, setPomodoroFocus] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartPomos, setAutoStartPomos] = useState(false);

  // Sound & System
  const [tickSpeed, setTickSpeed] = useState(15);
  const [timerSound, setTimerSound] = useState('Desk Clock');
  const [notifications, setNotifications] = useState(true);
  const [calendarSync, setCalendarSync] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTheme, setActiveTheme] = useState('default');

  const THEMES = [
      { id: 'default', name: 'Royal Purple', color: 'bg-[#7F13EC]' },
      { id: 'midnight', name: 'Midnight', color: 'bg-[#1E3A8A]', pro: true },
      { id: 'forest', name: 'Forest', color: 'bg-[#059669]', pro: true },
      { id: 'sunset', name: 'Sunset', color: 'bg-[#EA580C]', pro: true },
      { id: 'amoled', name: 'AMOLED', color: 'bg-[#000000]', pro: true },
  ];

  const handleThemeSelect = (themeId: string, isThemePro: boolean) => {
      if (isThemePro && !isPro) {
          setScreen(Screen.TEMPO_PRO);
      } else {
          setActiveTheme(themeId);
      }
  };

  const toggleCalendarSync = () => {
      if (!calendarSync) {
          // Simulate connecting
          setCalendarSync(true);
      } else {
          setCalendarSync(false);
      }
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-muted">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Settings</h2>
        <div className="w-10"></div> 
      </div>

      <div className="p-6 space-y-8">
        
        {/* Pro Banner (If not Pro) */}
        {!isPro && (
            <div 
                onClick={() => setScreen(Screen.TEMPO_PRO)}
                className="bg-gradient-to-r from-primary to-secondary p-1 rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform"
            >
                <div className="bg-background-dark/30 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-yellow-300">diamond</span>
                            <span className="font-bold text-white">Upgrade to Pro</span>
                        </div>
                        <p className="text-[10px] text-white/80">Unlock themes, advanced stats & more</p>
                    </div>
                    <span className="material-symbols-outlined text-white">chevron_right</span>
                </div>
            </div>
        )}

        {/* Timer Configuration */}
        <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Timer Configuration</h3>
            <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                
                {/* Durations */}
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-white">Focus Duration</label>
                        <span className="text-primary font-bold">{pomodoroFocus}m</span>
                    </div>
                    <input type="range" min="5" max="90" step="5" value={pomodoroFocus} onChange={(e) => setPomodoroFocus(Number(e.target.value))} className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"/>

                    <div className="flex justify-between items-center pt-2">
                        <label className="text-sm font-bold text-white">Short Break</label>
                        <span className="text-secondary font-bold">{shortBreak}m</span>
                    </div>
                    <input type="range" min="1" max="30" step="1" value={shortBreak} onChange={(e) => setShortBreak(Number(e.target.value))} className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary cursor-pointer"/>
                </div>

                {/* Long Break Config */}
                <div className="p-4">
                     <div className="flex justify-between items-center mb-3">
                         <span className="text-sm font-bold">Long Break Duration</span>
                         <span className="text-blue-400 font-bold">{longBreak}m</span>
                     </div>
                     <input type="range" min="10" max="60" step="5" value={longBreak} onChange={(e) => setLongBreak(Number(e.target.value))} className="w-full h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 cursor-pointer"/>
                     
                     <div className="flex justify-between items-center mt-4">
                         <div>
                            <p className="text-sm font-bold">Long Break Interval</p>
                            <p className="text-[10px] text-muted">Sessions before long break</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <button className="w-7 h-7 rounded bg-surface-light flex items-center justify-center hover:bg-white/10" onClick={() => setLongBreakInterval(Math.max(2, longBreakInterval-1))}>-</button>
                            <span className="text-sm font-bold">{longBreakInterval}</span>
                            <button className="w-7 h-7 rounded bg-surface-light flex items-center justify-center hover:bg-white/10" onClick={() => setLongBreakInterval(Math.min(10, longBreakInterval+1))}>+</button>
                         </div>
                     </div>
                </div>

                {/* Automation Toggles */}
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setAutoStartBreaks(!autoStartBreaks)}>
                    <div>
                        <p className="text-sm font-bold">Auto-start Breaks</p>
                        <p className="text-[10px] text-muted">No need to manually start break</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${autoStartBreaks ? 'bg-primary' : 'bg-surface-light'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoStartBreaks ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setAutoStartPomos(!autoStartPomos)}>
                    <div>
                        <p className="text-sm font-bold">Auto-start Pomodoros</p>
                        <p className="text-[10px] text-muted">Seamlessly start next session</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${autoStartPomos ? 'bg-primary' : 'bg-surface-light'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoStartPomos ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </div>
            </div>
        </section>

        {/* Sound & Notifications */}
        <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Sound & Feedback</h3>
            <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                {/* Timer End Sound */}
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5">
                     <span className="text-sm font-bold">Timer End Sound</span>
                     <div className="flex items-center gap-2 text-muted">
                        <span className="text-xs font-bold text-white">{timerSound}</span>
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                     </div>
                </div>

                {/* Ticking Sound */}
                <div className="p-4">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold">Ticking Sound</span>
                         <span className="text-xs text-muted font-bold">{tickSpeed} bpm</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <button onClick={() => setTickSpeed(0)} className={`p-2 rounded-lg text-xs font-bold border transition-colors ${tickSpeed === 0 ? 'bg-white text-black border-white' : 'border-white/10 text-muted'}`}>Off</button>
                        <input 
                            type="range" min="30" max="120" step="5" 
                            value={tickSpeed === 0 ? 60 : tickSpeed} 
                            disabled={tickSpeed === 0}
                            onChange={(e) => setTickSpeed(Number(e.target.value))} 
                            className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer ${tickSpeed === 0 ? 'bg-white/5' : 'bg-surface-light [&::-webkit-slider-thumb]:bg-white'}`}
                        />
                     </div>
                </div>
            </div>
        </section>

        {/* Appearance (Pro Features) */}
        <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-1">
                Appearance <span className="bg-primary/20 text-primary-light text-[9px] px-1.5 rounded font-bold">PRO</span>
            </h3>
            <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
                <p className="text-sm font-bold mb-3">App Theme</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {THEMES.map(theme => (
                        <div 
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme.id, !!theme.pro)} 
                            className="relative group cursor-pointer shrink-0"
                        >
                            <div className={`w-12 h-12 rounded-full ${theme.color} border-2 ${activeTheme === theme.id ? 'border-white' : 'border-transparent'} shadow-lg transition-all`}></div>
                            <span className="text-[10px] font-medium text-muted mt-1 block text-center w-full truncate">{theme.name}</span>
                            
                            {/* Pro Lock */}
                            {theme.pro && !isPro && (
                                <div className="absolute top-0 right-0 bg-black rounded-full p-1 border border-white/10 shadow-md">
                                    <span className="material-symbols-outlined text-[10px] text-yellow-400 block">lock</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Data & System */}
        <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">System</h3>
            <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => setNotifications(!notifications)}>
                    <p className="text-sm font-bold">Notifications</p>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary' : 'bg-surface-light'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </div>

                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={toggleCalendarSync}>
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-sm font-bold">Calendar Sync</p>
                            <p className="text-[10px] text-muted">
                                {calendarSync ? 'Connected: alex@gmail.com' : 'Sync Google Calendar'}
                            </p>
                        </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${calendarSync ? 'bg-primary' : 'bg-surface-light'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${calendarSync ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </div>
                
                {/* Pro Data Export */}
                <div 
                    onClick={() => !isPro && setScreen(Screen.TEMPO_PRO)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                >
                    <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${!isPro ? 'text-muted' : 'text-white'}`}>Export Data (CSV)</p>
                        {!isPro && <span className="material-symbols-outlined text-xs text-yellow-400">lock</span>}
                    </div>
                    <span className="material-symbols-outlined text-muted text-sm">download</span>
                </div>
            </div>
        </section>

        {/* Account */}
        <div className="text-center pt-4">
            <button onClick={() => setScreen(Screen.PROFILE)} className="text-xs font-bold text-muted hover:text-white transition-colors">Manage Account</button>
            <p className="text-[10px] text-muted/40 mt-2">v2.2.0 (Build 501)</p>
        </div>

      </div>
    </div>
  );
};