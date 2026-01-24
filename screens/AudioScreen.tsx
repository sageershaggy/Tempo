import React, { useState, useEffect } from 'react';
import { Screen, AudioState, GlobalProps } from '../types';
import { configManager, AudioTrackConfig } from '../config';
import { extractYouTubeId } from '../config/constants';

export const AudioScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState }) => {
  const [filter, setFilter] = useState('All');
  const [youtubeInput, setYoutubeInput] = useState('');

  // Load configuration dynamically
  const config = configManager.getConfig();
  const TRACKS = config.audio.tracks;
  const CATEGORIES = config.audio.categories;
  const BINAURAL_RANGES = config.audio.binauralRanges;
  
  // Helper to update specific track settings
  const updateTrackSetting = (trackId: string, updates: Partial<{ volume: number; hz: string }>) => {
    setAudioState(prev => ({
        ...prev,
        trackSettings: {
            ...prev.trackSettings,
            [trackId]: {
                ...(prev.trackSettings[trackId] || { volume: 50 }),
                ...updates
            }
        }
    }));
  };

  const toggleTrack = (track: SoundTrack) => {
      const isCurrent = audioState.activeTrackId === track.id;
      if (isCurrent && audioState.isPlaying) {
          // Pause
          setAudioState(prev => ({ ...prev, isPlaying: false }));
      } else {
          // Play new
          setAudioState(prev => ({ 
              ...prev, 
              isPlaying: true, 
              activeTrackId: track.id,
              youtubeId: null // Clear YT if regular track plays
          }));
      }
  };

  const handleYoutubePlay = () => {
      const videoId = extractYouTubeId(youtubeInput);
      if (videoId) {
          setAudioState(prev => ({
              ...prev,
              isPlaying: true,
              activeTrackId: null, // Clear regular track
              youtubeId: videoId
          }));
          setYoutubeInput('');
      } else {
          alert("Please enter a valid YouTube URL");
      }
  };

  const filteredTracks = filter === 'All' 
    ? TRACKS 
    : TRACKS.filter(t => t.category === filter);

  // Visualizer Bars Generation
  const visualizerBars = Array.from({ length: 24 }).map((_, i) => ({
      height: Math.random() * 100,
      delay: Math.random() * 0.5
  }));

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 z-10 shrink-0">
             <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
             <h2 className="text-lg font-bold">Soundscapes</h2>
             <div className="w-10"></div>
        </div>

        {/* Visualizer Area */}
        <div className="h-40 px-6 mb-2 shrink-0 z-10">
            <div className="w-full h-full rounded-2xl bg-surface-dark border border-white/5 relative overflow-hidden flex items-center justify-center">
                 {/* Current Info */}
                 <div className="absolute top-3 left-4 z-20">
                    <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${audioState.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            {audioState.youtubeId ? 'YouTube Stream' : (audioState.activeTrackId ? TRACKS.find(t=>t.id===audioState.activeTrackId)?.name : 'Not Playing')}
                         </span>
                    </div>
                 </div>

                 {audioState.isPlaying ? (
                     <div className="flex items-end gap-1 h-16 opacity-80">
                         {visualizerBars.map((bar, i) => (
                             <div 
                                key={i}
                                className="w-1.5 bg-secondary rounded-t-sm animate-pulse-slow"
                                style={{ 
                                    height: `${bar.height}%`,
                                    animationDuration: '0.8s',
                                    animationDelay: `${bar.delay}s`,
                                    animationIterationCount: 'infinite'
                                }}
                             ></div>
                         ))}
                     </div>
                 ) : (
                    <span className="material-symbols-outlined text-4xl text-white/5">graphic_eq</span>
                 )}
            </div>
        </div>

        {/* Categories */}
        <div className="px-6 mb-4 overflow-x-auto no-scrollbar shrink-0">
             <div className="flex gap-2">
                 {CATEGORIES.map(cat => (
                     <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                            filter === cat ? 'bg-white text-black border-white' : 'bg-white/5 text-muted border-white/5 hover:bg-white/10'
                        }`}
                     >
                         {cat}
                     </button>
                 ))}
             </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3 z-10 no-scrollbar pb-32">
            {/* YouTube Input */}
            <div className="bg-surface-dark/50 rounded-xl p-3 border border-white/5 mb-4">
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Paste YouTube Link..." 
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                    <button 
                        onClick={handleYoutubePlay}
                        className="px-3 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">play_circle</span>
                    </button>
                </div>
            </div>

            {filteredTracks.map(track => {
                const isActive = audioState.activeTrackId === track.id;
                const settings = audioState.trackSettings[track.id] || { volume: 50 };

                return (
                    <div 
                        key={track.id} 
                        className={`rounded-xl border transition-all overflow-hidden ${isActive ? 'bg-surface-light border-primary shadow-lg' : 'bg-surface-dark border-white/5 hover:border-white/10'}`}
                    >
                        <div 
                            className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => toggleTrack(track)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive && audioState.isPlaying ? 'bg-primary text-white' : 'bg-white/5 text-muted'}`}>
                                    <span className="material-symbols-outlined">{isActive && audioState.isPlaying ? 'pause' : 'play_arrow'}</span>
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>{track.name}</p>
                                    <p className="text-[10px] text-muted">{track.category}</p>
                                </div>
                            </div>
                            {track.hz && <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded">{track.hz}</span>}
                        </div>

                        {/* Expanded Controls */}
                        {isActive && (
                            <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20 animate-fade-in">
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="material-symbols-outlined text-xs text-muted">volume_down</span>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={settings.volume}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => updateTrackSetting(track.id, { volume: Number(e.target.value) })}
                                        className="flex-1 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
                                    />
                                    <span className="text-xs font-mono w-8 text-right">{settings.volume}%</span>
                                </div>
                                
                                {track.category === 'Binaural' && (
                                    <div className="flex gap-2 mt-3">
                                        {BINAURAL_RANGES.map(r => (
                                            <button
                                                key={r}
                                                onClick={(e) => { e.stopPropagation(); /* Mock Hz change */ }}
                                                className="flex-1 py-1 text-[10px] font-bold border border-white/10 rounded hover:bg-white/10 transition-colors"
                                            >
                                                {r} Range
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Master Controls */}
        <div className="absolute bottom-0 w-full bg-surface-dark/95 backdrop-blur-xl border-t border-white/10 p-6 rounded-t-3xl z-20 pb-8">
            <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] font-bold uppercase text-muted">Master</span>
                <input 
                    type="range" 
                    min="0" max="100" 
                    value={audioState.volume}
                    onChange={(e) => setAudioState(prev => ({ ...prev, volume: Number(e.target.value) }))}
                    className="flex-1 h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
                />
            </div>
             <button 
                className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                onClick={() => setScreen(Screen.TIMER)}
            >
                Return to Timer
            </button>
        </div>
    </div>
  );
};