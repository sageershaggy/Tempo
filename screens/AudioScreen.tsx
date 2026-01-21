import React, { useState, useEffect } from 'react';
import { Screen, AudioState, GlobalProps } from '../types';

interface SoundTrack {
  id: string;
  name: string;
  category: string;
  hz?: string;
  icon: string;
}

const TRACKS: SoundTrack[] = [
  // Binaural
  { id: '1', name: 'Gamma Focus', category: 'Binaural', hz: '40 Hz', icon: 'waves' },
  { id: '2', name: 'Beta Study', category: 'Binaural', hz: '14 Hz', icon: 'psychology' },
  { id: '16', name: 'Theta Meditation', category: 'Binaural', hz: '6 Hz', icon: 'self_improvement' },
  { id: '17', name: 'Delta Sleep', category: 'Binaural', hz: '2 Hz', icon: 'bedtime' },
  { id: '3', name: 'Alpha Flow', category: 'Binaural', hz: '10 Hz', icon: 'water_drop' },
  // Solfeggio
  { id: '4', name: 'Deep Restoration', category: 'Solfeggio', hz: '432 Hz', icon: 'spa' },
  { id: '5', name: 'Miracle Tone', category: 'Solfeggio', hz: '528 Hz', icon: 'healing' },
  // Ambience
  { id: '6', name: 'Heavy Rain', category: 'Ambience', icon: 'rainy' },
  { id: '7', name: 'Coffee Shop', category: 'Ambience', icon: 'storefront' },
  { id: '11', name: 'Forest Stream', category: 'Ambience', icon: 'forest' },
  { id: '12', name: 'Ocean Waves', category: 'Ambience', icon: 'surfing' },
  { id: '13', name: 'Crackling Fire', category: 'Ambience', icon: 'fireplace' },
  { id: '14', name: 'Night Crickets', category: 'Ambience', icon: 'nights_stay' },
  { id: '15', name: 'Wind Chimes', category: 'Ambience', icon: 'air' },
  // Noise
  { id: '8', name: 'Brown Noise', category: 'Noise', icon: 'graphic_eq' },
  { id: '9', name: 'White Noise', category: 'Noise', icon: 'static' },
  { id: '10', name: 'Pink Noise', category: 'Noise', icon: 'blur_on' },
  // Music
  { id: '18', name: 'Lo-Fi Beats', category: 'Music', icon: 'headphones' },
];

const CATEGORIES = ['All', 'Binaural', 'Ambience', 'Solfeggio', 'Noise', 'Music'];

export const AudioScreen: React.FC<GlobalProps> = ({ setScreen, audioState, setAudioState }) => {
  const [filter, setFilter] = useState('All');
  const [youtubeInput, setYoutubeInput] = useState('');
  
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
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = youtubeInput.match(regExp);
      if (match && match[2].length === 11) {
          setAudioState(prev => ({
              ...prev,
              isPlaying: true,
              activeTrackId: null, // Clear regular track
              youtubeId: match[2]
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
                                        {['Low', 'Mid', 'High'].map(r => (
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