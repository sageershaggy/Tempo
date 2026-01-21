import React, { useState } from 'react';
import { Screen } from '../types';

interface SoundTrack {
  id: string;
  name: string;
  category: string;
  hz?: string;
  icon: string;
}

const TRACKS: SoundTrack[] = [
  { id: '1', name: 'Gamma Focus', category: 'Binaural', hz: '40 Hz', icon: 'waves' },
  { id: '2', name: 'Beta Study', category: 'Binaural', hz: '14 Hz', icon: 'psychology' },
  { id: '3', name: 'Alpha Flow', category: 'Binaural', hz: '10 Hz', icon: 'water_drop' },
  { id: '4', name: 'Deep Restoration', category: 'Solfeggio', hz: '432 Hz', icon: 'spa' },
  { id: '5', name: 'Miracle Tone', category: 'Solfeggio', hz: '528 Hz', icon: 'healing' },
  { id: '6', name: 'Heavy Rain', category: 'Ambience', icon: 'rainy' },
  { id: '7', name: 'Coffee Shop', category: 'Ambience', icon: 'storefront' },
  { id: '8', name: 'Brown Noise', category: 'Noise', icon: 'graphic_eq' },
];

export const AudioScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(70);

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 z-10">
             <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined">arrow_back</span></button>
             <h2 className="text-lg font-bold">Soundscapes</h2>
             <div className="w-10"></div>
        </div>

        {/* Visualizer (Fake) */}
        <div className="h-32 flex items-center justify-center gap-1 px-10 mb-4 z-10">
            {playingId ? (
                Array.from({ length: 20 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1.5 bg-secondary rounded-full animate-pulse" 
                        style={{ 
                            height: `${Math.random() * 80 + 20}%`, 
                            animationDuration: `${Math.random() * 0.5 + 0.5}s` 
                        }}
                    ></div>
                ))
            ) : (
                <div className="text-muted text-sm font-medium">Select a sound to focus</div>
            )}
        </div>

        {/* Categories & List */}
        <div className="flex-1 overflow-y-auto px-6 space-y-2 z-10 no-scrollbar pb-32">
            {['Binaural', 'Solfeggio', 'Ambience', 'Noise'].map((cat) => (
                <div key={cat} className="mb-6">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{cat}</h3>
                    <div className="space-y-3">
                        {TRACKS.filter(t => t.category === cat).map(track => {
                            const isPlaying = playingId === track.id;
                            return (
                                <div 
                                    key={track.id} 
                                    onClick={() => togglePlay(track.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isPlaying ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(127,19,236,0.2)]' : 'bg-surface-dark border-white/5 hover:border-white/20'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-primary text-white' : 'bg-white/5 text-muted'}`}>
                                            <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${isPlaying ? 'text-white' : 'text-gray-300'}`}>{track.name}</p>
                                            {track.hz && <p className="text-xs text-secondary font-bold">{track.hz}</p>}
                                        </div>
                                    </div>
                                    {isPlaying && (
                                        <div className="text-primary">
                                            <span className="material-symbols-outlined animate-spin">graphic_eq</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {/* Floating Player Controls */}
        <div className="absolute bottom-0 w-full bg-surface-dark/95 backdrop-blur-xl border-t border-white/10 p-6 rounded-t-3xl z-20 pb-8">
            <div className="flex items-center gap-4 mb-4">
                <span className="material-symbols-outlined text-muted text-sm">volume_down</span>
                <input 
                    type="range" 
                    min="0" max="100" 
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <span className="material-symbols-outlined text-white text-sm">volume_up</span>
            </div>
            <div className="flex justify-center">
                <button 
                    className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    onClick={() => setScreen(Screen.TIMER)}
                >
                    Return to Timer
                </button>
            </div>
        </div>
    </div>
  );
};