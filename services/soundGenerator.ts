// Background Sound Generator using Web Audio API
// Generates binaural beats, noise types, and Hz tones without external sources

// Use a persistent AudioContext - don't keep creating/closing them
let sharedCtx: AudioContext | null = null;
let activeGain: GainNode | null = null;
let activeNodes: AudioNode[] = [];
let isPlaying = false;

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

  // Map track IDs to sound generation
  switch (trackId) {
    // Binaural beats
    case '1': // Gamma Focus 40Hz
      createBinaural(ctx, gainNode, 200, 240);
      break;
    case '2': // Beta Study 14Hz
      createBinaural(ctx, gainNode, 200, 214);
      break;
    case '3': // Alpha Flow 10Hz
      createBinaural(ctx, gainNode, 200, 210);
      break;
    case '16': // Theta Meditation 6Hz
      createBinaural(ctx, gainNode, 200, 206);
      break;
    case '17': // Delta Sleep 2Hz
      createBinaural(ctx, gainNode, 200, 202);
      break;

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
      return;
  }

  isPlaying = true;
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
};

export const isSoundPlaying = (): boolean => isPlaying;

export const isBuiltInTrack = (trackId: string): boolean => {
  return ['1', '2', '3', '4', '5', '8', '9', '10', '16', '17'].includes(trackId);
};
