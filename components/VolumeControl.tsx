import React from 'react';

const VOLUME_STEP = 10;
const DEFAULT_UNMUTE_VOLUME = 50;

// Last audible level, restored on unmute. Module-level so it survives the
// sound bar hiding and re-showing while the popup stays open.
let lastAudibleVolume = DEFAULT_UNMUTE_VOLUME;

interface VolumeControlProps {
  /** Tempo's own playback volume, 0-100. */
  volume: number;
  onChange: (volume: number) => void;
  className?: string;
}

const clampVolume = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Mute / volume down / slider / volume up controls for Tempo's sound.
 *
 * This is Tempo's own volume, applied on top of the device volume. Browsers
 * give extensions no way to read or change the system volume, so the label
 * says so rather than implying the two are linked.
 */
export const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onChange, className = '' }) => {
  const isMuted = volume <= 0;
  if (!isMuted) lastAudibleVolume = volume;

  const setVolume = (value: number) => onChange(clampVolume(value));

  const toggleMute = () => {
    setVolume(isMuted ? (lastAudibleVolume || DEFAULT_UNMUTE_VOLUME) : 0);
  };

  const icon = isMuted ? 'volume_off' : volume < 50 ? 'volume_down' : 'volume_up';
  const buttonClass = 'w-7 h-7 shrink-0 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleMute}
          className={`${buttonClass} ${isMuted ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'text-muted hover:text-white hover:bg-white/10'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute Tempo sound' : 'Mute Tempo sound'}
          aria-pressed={isMuted}
        >
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </button>
        <button
          type="button"
          onClick={() => setVolume(volume - VOLUME_STEP)}
          disabled={volume <= 0}
          className={`${buttonClass} text-muted hover:text-white hover:bg-white/10`}
          title="Volume down"
          aria-label="Volume down"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Tempo volume"
          className="flex-1 min-w-0 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setVolume(volume + VOLUME_STEP)}
          disabled={volume >= 100}
          className={`${buttonClass} text-muted hover:text-white hover:bg-white/10`}
          title="Volume up"
          aria-label="Volume up"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
        <span className="text-[10px] font-mono text-muted w-10 text-right shrink-0" aria-live="polite">
          {isMuted ? 'Muted' : `${volume}%`}
        </span>
      </div>
      <p className="mt-1 text-[9px] text-muted/70">
        Tempo volume — mixes with your device volume, which is set by your system.
      </p>
    </div>
  );
};
