// Background Sound Generator using Web Audio API
// Generates binaural beats, noise types, and Hz tones without external sources

// Use a persistent AudioContext - don't keep creating/closing them
let sharedCtx: AudioContext | null = null;
let activeGain: GainNode | null = null;
let activeNodes: AudioNode[] = [];
let isPlaying = false;
let currentTrackId: string | null = null;
let currentVolume: number = 0.5;

// Binaural range frequency mappings
// Each range maps to {base, beat} where the binaural beat = right - left frequency
export type BinauralRange = 'Low' | 'Mid' | 'High';

interface BinauralPreset {
  baseFreq: number;
  beatFreq: number; // The binaural beat frequency (difference between L and R)
  label: string;
}

// Each track has range presets: Low (delta/theta), Mid (alpha), High (beta/gamma)
const BINAURAL_RANGE_MAP: Record<string, Record<BinauralRange, BinauralPreset>> = {
  '1': { // Gamma Focus - default 40Hz
    Low:  { baseFreq: 200, beatFreq: 6,  label: '6 Hz (Theta)' },
    Mid:  { baseFreq: 200, beatFreq: 10, label: '10 Hz (Alpha)' },
    High: { baseFreq: 200, beatFreq: 40, label: '40 Hz (Gamma)' },
  },
  '2': { // Beta Study - default 14Hz
    Low:  { baseFreq: 200, beatFreq: 4,  label: '4 Hz (Theta)' },
    Mid:  { baseFreq: 200, beatFreq: 10, label: '10 Hz (Alpha)' },
    High: { baseFreq: 200, beatFreq: 14, label: '14 Hz (Beta)' },
  },
  '3': { // Alpha Flow - default 10Hz
    Low:  { baseFreq: 200, beatFreq: 3,  label: '3 Hz (Delta)' },
    Mid:  { baseFreq: 200, beatFreq: 10, label: '10 Hz (Alpha)' },
    High: { baseFreq: 200, beatFreq: 30, label: '30 Hz (Gamma)' },
  },
  '16': { // Theta Meditation - default 6Hz
    Low:  { baseFreq: 200, beatFreq: 2,  label: '2 Hz (Delta)' },
    Mid:  { baseFreq: 200, beatFreq: 6,  label: '6 Hz (Theta)' },
    High: { baseFreq: 200, beatFreq: 12, label: '12 Hz (Alpha)' },
  },
  '17': { // Delta Sleep - default 2Hz
    Low:  { baseFreq: 200, beatFreq: 1,  label: '1 Hz (Deep Delta)' },
    Mid:  { baseFreq: 200, beatFreq: 4,  label: '4 Hz (Theta)' },
    High: { baseFreq: 200, beatFreq: 8,  label: '8 Hz (Alpha)' },
  },
};

// Track which range is active per track
const activeRanges: Record<string, BinauralRange> = {};

const getContext = (): AudioContext => {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
};

const createNoiseBuffer = (ctx: AudioContext, type: 'white' | 'brown' | 'pink'): AudioBufferSourceNode => {
  const bufferSize = ctx.sampleRate * 4; // 4 seconds of audio
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

export const stopSound = () => {
  activeNodes.forEach(node => {
    try {
      if (node instanceof OscillatorNode) node.stop();
      if (node instanceof AudioBufferSourceNode) node.stop();
    } catch (e) {
      // Already stopped
    }
  });
  activeNodes = [];

  if (activeGain) {
    try { activeGain.disconnect(); } catch (e) {}
    activeGain = null;
  }

  isPlaying = false;
  currentTrackId = null;
  // Don't close the context - reuse it
};

export const playSound = async (trackId: string, volume: number = 0.5): Promise<void> => {
  // Stop any existing sound first
  stopSound();

  const ctx = getContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.max(0, Math.min(1, volume));
  gainNode.connect(ctx.destination);
  activeGain = gainNode;
  currentTrackId = trackId;
  currentVolume = volume;

  // Check if this is a binaural track with a specific range set
  const rangeMap = BINAURAL_RANGE_MAP[trackId];
  if (rangeMap) {
    const range = activeRanges[trackId] || getDefaultRange(trackId);
    const preset = rangeMap[range];
    createBinaural(ctx, gainNode, preset.baseFreq, preset.baseFreq + preset.beatFreq);
    isPlaying = true;
    return;
  }

  // Map track IDs to sound generation
  switch (trackId) {
    // Solfeggio
    case '4': // 432 Hz
      createTone(ctx, gainNode, 432);
      break;
    case '5': // 528 Hz
      createTone(ctx, gainNode, 528);
      break;

    // Noise
    case '8': // Brown Noise
      createNoise(ctx, gainNode, 'brown');
      break;
    case '9': // White Noise
      createNoise(ctx, gainNode, 'white');
      break;
    case '10': // Pink Noise
      createNoise(ctx, gainNode, 'pink');
      break;

    default:
      // No built-in sound for this track
      gainNode.disconnect();
      activeGain = null;
      currentTrackId = null;
      return;
  }

  isPlaying = true;
};

// Get default range for a binaural track based on its original frequency
const getDefaultRange = (trackId: string): BinauralRange => {
  switch (trackId) {
    case '1': return 'High';  // Gamma Focus = High range
    case '2': return 'High';  // Beta Study = High range
    case '3': return 'Mid';   // Alpha Flow = Mid range
    case '16': return 'Mid';  // Theta Meditation = Mid range
    case '17': return 'Low';  // Delta Sleep = Low range
    default: return 'Mid';
  }
};

// Switch binaural range for currently playing track
export const switchBinauralRange = async (trackId: string, range: BinauralRange): Promise<string | null> => {
  activeRanges[trackId] = range;
  const rangeMap = BINAURAL_RANGE_MAP[trackId];
  if (!rangeMap) return null;

  const preset = rangeMap[range];

  // If this track is currently playing, restart with new frequency
  if (isPlaying && currentTrackId === trackId) {
    await playSound(trackId, currentVolume);
  }

  return preset.label;
};

// Get the current range for a binaural track
export const getBinauralRange = (trackId: string): BinauralRange => {
  return activeRanges[trackId] || getDefaultRange(trackId);
};

// Get range info for display
export const getBinauralRangeInfo = (trackId: string, range: BinauralRange): BinauralPreset | null => {
  const rangeMap = BINAURAL_RANGE_MAP[trackId];
  if (!rangeMap) return null;
  return rangeMap[range];
};

// Check if a track is binaural
export const isBinauralTrack = (trackId: string): boolean => {
  return trackId in BINAURAL_RANGE_MAP;
};

const createBinaural = (ctx: AudioContext, gainNode: GainNode, freqL: number, freqR: number) => {
  const merger = ctx.createChannelMerger(2);
  merger.connect(gainNode);

  const oscL = ctx.createOscillator();
  oscL.frequency.value = freqL;
  oscL.type = 'sine';
  const gainL = ctx.createGain();
  gainL.gain.value = 0.5;
  oscL.connect(gainL);
  gainL.connect(merger, 0, 0);
  oscL.start();

  const oscR = ctx.createOscillator();
  oscR.frequency.value = freqR;
  oscR.type = 'sine';
  const gainR = ctx.createGain();
  gainR.gain.value = 0.5;
  oscR.connect(gainR);
  gainR.connect(merger, 0, 1);
  oscR.start();

  activeNodes.push(oscL, oscR, gainL, gainR, merger);
};

const createTone = (ctx: AudioContext, gainNode: GainNode, freq: number) => {
  const osc = ctx.createOscillator();
  osc.frequency.value = freq;
  osc.type = 'sine';

  // Subtle warmth with second harmonic
  const osc2 = ctx.createOscillator();
  osc2.frequency.value = freq * 2;
  osc2.type = 'sine';
  const g2 = ctx.createGain();
  g2.gain.value = 0.08;
  osc2.connect(g2);
  g2.connect(gainNode);

  osc.connect(gainNode);
  osc.start();
  osc2.start();
  activeNodes.push(osc, osc2, g2);
};

const createNoise = (ctx: AudioContext, gainNode: GainNode, type: 'white' | 'brown' | 'pink') => {
  const source = createNoiseBuffer(ctx, type);
  source.connect(gainNode);
  source.start();
  activeNodes.push(source);
};

export const setVolume = (volume: number) => {
  if (activeGain) {
    activeGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  currentVolume = volume;
};

export const isSoundPlaying = (): boolean => isPlaying;

export const getCurrentTrackId = (): string | null => currentTrackId;

export const isBuiltInTrack = (trackId: string): boolean => {
  return ['1', '2', '3', '4', '5', '8', '9', '10', '16', '17'].includes(trackId);
};
