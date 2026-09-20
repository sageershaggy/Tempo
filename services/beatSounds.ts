// Catalog + playback helpers for Focus Beat.
// Generators live in public/beatSounds.js (used by the offscreen document).
// This module exposes the same catalog to the React UI and loads that script
// for the local/dev AudioContext fallback.

export type BeatSoundId =
  | 'soft'
  | 'tick'
  | 'wood'
  | 'chime'
  | 'drop'
  | 'pulse'
  | 'digital'
  | 'bowl'
  | 'glass'
  | 'knock'
  | 'marimba'
  | 'snap'
  | 'shaker'
  | 'chirp'
  | 'tone'
  | 'clap';

export interface BeatSoundOption {
  id: BeatSoundId;
  name: string;
  icon: string;
}

export const BEAT_SOUND_OPTIONS: BeatSoundOption[] = [
  { id: 'soft', name: 'Soft', icon: 'waves' },
  { id: 'tick', name: 'Tick', icon: 'timer' },
  { id: 'wood', name: 'Wood', icon: 'forest' },
  { id: 'chime', name: 'Bell', icon: 'notifications' },
  { id: 'drop', name: 'Water', icon: 'water_drop' },
  { id: 'pulse', name: 'Heart', icon: 'favorite' },
  { id: 'digital', name: 'Digital', icon: 'memory' },
  { id: 'bowl', name: 'Bowl', icon: 'self_improvement' },
  { id: 'glass', name: 'Glass', icon: 'wine_bar' },
  { id: 'knock', name: 'Knock', icon: 'door_front' },
  { id: 'marimba', name: 'Marimba', icon: 'piano' },
  { id: 'snap', name: 'Snap', icon: 'touch_app' },
  { id: 'shaker', name: 'Shaker', icon: 'grain' },
  { id: 'chirp', name: 'Chirp', icon: 'emoji_nature' },
  { id: 'tone', name: 'Tone', icon: 'graphic_eq' },
  { id: 'clap', name: 'Clap', icon: 'back_hand' },
];

declare global {
  interface Window {
    TempoBeatSounds?: {
      play: (ctx: AudioContext, soundType: string) => void;
      catalog: BeatSoundOption[];
    };
  }
}

let loadPromise: Promise<void> | null = null;

export function ensureBeatSoundsLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.TempoBeatSounds?.play) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tempo-beat-sounds]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load beat sounds')));
      return;
    }

    const script = document.createElement('script');
    script.src = './beatSounds.js';
    script.async = true;
    script.dataset.tempoBeatSounds = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load beat sounds'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function playBeatSound(ctx: AudioContext, soundType: string): Promise<void> {
  await ensureBeatSoundsLoaded();
  window.TempoBeatSounds?.play(ctx, soundType);
}
