// Tempo Focus - Offscreen Audio Engine
// Runs in a persistent offscreen document to keep audio playing when popup closes

let sharedCtx = null;
let activeGain = null;
let activeNodes = [];
let isPlaying = false;
let currentTrackId = null;
let currentVolume = 0.5;

// Focus Beat state
let focusBeatInterval = null;
let focusBeatEnabled = false;
let focusBeatIntervalMs = 1000;
let focusBeatCount = 0;
let focusBeatSoundType = 'soft'; // default sound type

// Binaural range frequency mappings
const BINAURAL_RANGE_MAP = {
  '1': {
    Low: { baseFreq: 200, beatFreq: 6 },
    Mid: { baseFreq: 200, beatFreq: 10 },
    High: { baseFreq: 200, beatFreq: 40 },
  },
  '2': {
    Low: { baseFreq: 200, beatFreq: 4 },
    Mid: { baseFreq: 200, beatFreq: 10 },
    High: { baseFreq: 200, beatFreq: 14 },
  },
  '3': {
    Low: { baseFreq: 200, beatFreq: 3 },
    Mid: { baseFreq: 200, beatFreq: 10 },
    High: { baseFreq: 200, beatFreq: 30 },
  },
  '16': {
    Low: { baseFreq: 200, beatFreq: 2 },
    Mid: { baseFreq: 200, beatFreq: 6 },
    High: { baseFreq: 200, beatFreq: 12 },
  },
  '17': {
    Low: { baseFreq: 200, beatFreq: 1 },
    Mid: { baseFreq: 200, beatFreq: 4 },
    High: { baseFreq: 200, beatFreq: 8 },
  },
};

const activeRanges = {};

function getContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

function createNoiseBuffer(ctx, type) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * w) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createBinaural(ctx, gainNode, freqL, freqR) {
  const merger = ctx.createChannelMerger(2);
  merger.connect(gainNode);

  const oscL = ctx.createOscillator();
  oscL.frequency.value = freqL;
  oscL.type = 'sine';
  const gL = ctx.createGain();
  gL.gain.value = 0.5;
  oscL.connect(gL);
  gL.connect(merger, 0, 0);
  oscL.start();

  const oscR = ctx.createOscillator();
  oscR.frequency.value = freqR;
  oscR.type = 'sine';
  const gR = ctx.createGain();
  gR.gain.value = 0.5;
  oscR.connect(gR);
  gR.connect(merger, 0, 1);
  oscR.start();

  activeNodes.push(oscL, oscR, gL, gR, merger);
}

function createTone(ctx, gainNode, freq) {
  const osc = ctx.createOscillator();
  osc.frequency.value = freq;
  osc.type = 'sine';

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
}

function createNoise(ctx, gainNode, type) {
  const source = createNoiseBuffer(ctx, type);
  source.connect(gainNode);
  source.start();
  activeNodes.push(source);
}

function stopSound() {
  activeNodes.forEach(node => {
    try {
      if (node instanceof OscillatorNode) node.stop();
      if (node instanceof AudioBufferSourceNode) node.stop();
    } catch (e) { }
  });
  activeNodes = [];
  if (activeGain) {
    try { activeGain.disconnect(); } catch (e) { }
    activeGain = null;
  }
  isPlaying = false;
  currentTrackId = null;
}

function getDefaultRange(trackId) {
  switch (trackId) {
    case '1': return 'High';
    case '2': return 'High';
    case '3': return 'Mid';
    case '16': return 'Mid';
    case '17': return 'Low';
    default: return 'Mid';
  }
}

async function playTrack(trackId, volume, range) {
  stopSound();

  const ctx = getContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.max(0, Math.min(1, volume));
  gainNode.connect(ctx.destination);
  activeGain = gainNode;
  currentTrackId = trackId;
  currentVolume = volume;

  // Binaural tracks
  const rangeMap = BINAURAL_RANGE_MAP[trackId];
  if (rangeMap) {
    const r = range || activeRanges[trackId] || getDefaultRange(trackId);
    activeRanges[trackId] = r;
    const preset = rangeMap[r];
    createBinaural(ctx, gainNode, preset.baseFreq, preset.baseFreq + preset.beatFreq);
    isPlaying = true;
    return;
  }

  // Other tracks
  switch (trackId) {
    case '4': createTone(ctx, gainNode, 432); break;
    case '5': createTone(ctx, gainNode, 528); break;
    case '8': createNoise(ctx, gainNode, 'brown'); break;
    case '9': createNoise(ctx, gainNode, 'white'); break;
    case '10': createNoise(ctx, gainNode, 'pink'); break;
    default:
      gainNode.disconnect();
      activeGain = null;
      currentTrackId = null;
      return;
  }
  isPlaying = true;
}

function setVolumeLevel(volume) {
  if (activeGain) {
    activeGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  currentVolume = volume;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle ping to check if offscreen is alive
  if (message.action === 'ping' && message.target === 'offscreen-audio') {
    sendResponse({ success: true, pong: true });
    return;
  }

  if (message.target !== 'offscreen-audio') {
    // Not for us - don't respond
    return false;
  }

  console.log('[Tempo Offscreen] Processing action:', message.action);

  console.log('[Tempo Offscreen] Processing action:', message.action);

  switch (message.action) {
    case 'play':
      console.log('[Tempo Offscreen] Playing track:', message.trackId, 'volume:', message.volume);
      playTrack(message.trackId, message.volume || 0.5, message.range)
        .then(() => {
          console.log('[Tempo Offscreen] Track started successfully');
          sendResponse({ success: true, isPlaying: true, trackId: message.trackId });
        })
        .catch(e => {
          console.error('[Tempo Offscreen] Play failed:', e);
          sendResponse({ success: false, error: e.message });
        });
      return true;

    case 'stop':
      stopSound();
      sendResponse({ success: true, isPlaying: false });
      break;

    case 'setVolume':
      setVolumeLevel(message.volume);
      sendResponse({ success: true });
      break;

    case 'switchRange':
      if (message.trackId && message.range) {
        activeRanges[message.trackId] = message.range;
        if (isPlaying && currentTrackId === message.trackId) {
          playTrack(message.trackId, currentVolume, message.range)
            .then(() => sendResponse({ success: true }));
          return true;
        }
      }
      sendResponse({ success: true });
      break;

    case 'getStatus':
      sendResponse({ isPlaying, trackId: currentTrackId, volume: currentVolume });
      break;

    // Focus Beat commands
    case 'focusBeat-start':
      startFocusBeat(message.intervalSeconds || 1, message.soundType || 'soft');
      sendResponse({ success: true, ...getFocusBeatStatus() });
      break;

    case 'focusBeat-changeSoundType':
      focusBeatSoundType = message.soundType || 'soft';
      // Update persisted state with new sound type
      if (focusBeatEnabled && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['focusBeatState'], (result) => {
          if (result.focusBeatState) {
            chrome.storage.local.set({
              focusBeatState: { ...result.focusBeatState, soundType: focusBeatSoundType }
            });
          }
        });
      }
      sendResponse({ success: true, soundType: focusBeatSoundType });
      break;

    case 'focusBeat-stop':
      stopFocusBeat();
      sendResponse({ success: true, enabled: false });
      break;

    case 'focusBeat-status':
      if (focusBeatEnabled) {
        sendResponse(getFocusBeatStatus());
      } else {
        // Check storage in case we are currently restoring or just loaded
        // Safety check for chrome.storage
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
          sendResponse({ enabled: false, count: 0 });
          break;
        }
        chrome.storage.local.get(['focusBeatState'], (result) => {
          if (chrome.runtime.lastError) {
            sendResponse({ enabled: false, count: 0 });
            return;
          }
          const state = result.focusBeatState;
          if (state && state.enabled) {
            // Logic to estimate count same as getFocusBeatStatus
            const now = Date.now();
            const elapsed = now - state.startTime;
            const count = Math.floor(elapsed / (state.interval * 1000)) + 1;

            sendResponse({
              enabled: true,
              intervalMs: state.interval * 1000,
              count: count
            });
            // Ensure restore is triggered if not already
            if (!focusBeatInterval) restoreFocusBeatState();
          } else {
            sendResponse({ enabled: false, count: 0 });
          }
        });
        return true; // Keep channel open for async response
      }
      break;

    case 'playCompletionSound':
      playCompletionBeep();
      sendResponse({ success: true });
      break;

    case 'playReminderSound':
      playReminderBeep();
      sendResponse({ success: true });
      break;
  }
});

// ============================================================================
// FOCUS BEAT - Persistent metronome that works when popup is closed
// ============================================================================

// ============================================================================
// FOCUS BEAT - Persistent metronome that works when popup is closed
// ============================================================================

let focusBeatStartTime = null;

// Beat sound generators for different styles
const beatSounds = {
  // Soft sine wave - gentle and unobtrusive
  soft: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 220;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  },

  // Tick - crisp click sound like a metronome
  tick: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1000;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  },

  // Wood - woodblock-like percussive sound
  wood: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  },

  // Chime - soft bell "ting" with natural harmonics and decay
  chime: (ctx) => {
    const now = ctx.currentTime;

    // Fundamental tone - the main bell sound
    const fundamental = ctx.createOscillator();
    const fundamentalGain = ctx.createGain();

    fundamental.connect(fundamentalGain);
    fundamentalGain.connect(ctx.destination);

    fundamental.frequency.value = 1319; // E6 - high, delicate bell tone
    fundamental.type = 'sine';

    fundamentalGain.gain.setValueAtTime(0.25, now);
    fundamentalGain.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
    fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    fundamental.start(now);
    fundamental.stop(now + 0.8);

    // First harmonic - adds shimmer
    const harmonic1 = ctx.createOscillator();
    const harmonic1Gain = ctx.createGain();

    harmonic1.connect(harmonic1Gain);
    harmonic1Gain.connect(ctx.destination);

    harmonic1.frequency.value = 2637; // E7 - octave above
    harmonic1.type = 'sine';

    harmonic1Gain.gain.setValueAtTime(0.12, now);
    harmonic1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    harmonic1.start(now);
    harmonic1.stop(now + 0.5);

    // Second harmonic - subtle sparkle
    const harmonic2 = ctx.createOscillator();
    const harmonic2Gain = ctx.createGain();

    harmonic2.connect(harmonic2Gain);
    harmonic2Gain.connect(ctx.destination);

    harmonic2.frequency.value = 3951; // B7 - adds brightness
    harmonic2.type = 'sine';

    harmonic2Gain.gain.setValueAtTime(0.06, now);
    harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    harmonic2.start(now);
    harmonic2.stop(now + 0.3);

    // Slight attack noise for the "ting" onset
    const attackNoise = ctx.createOscillator();
    const attackGain = ctx.createGain();

    attackNoise.connect(attackGain);
    attackGain.connect(ctx.destination);

    attackNoise.frequency.value = 4000;
    attackNoise.type = 'sine';

    attackGain.gain.setValueAtTime(0.15, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    attackNoise.start(now);
    attackNoise.stop(now + 0.02);
  },

  // Drop - realistic water drop sound with splash and resonance
  drop: (ctx) => {
    const now = ctx.currentTime;

    // Main drop - initial impact with pitch bend (like water hitting surface)
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    const dropFilter = ctx.createBiquadFilter();

    dropOsc.connect(dropFilter);
    dropFilter.connect(dropGain);
    dropGain.connect(ctx.destination);

    // Start high and drop quickly - mimics water drop hitting surface
    dropOsc.frequency.setValueAtTime(2400, now);
    dropOsc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
    dropOsc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    dropOsc.type = 'sine';

    dropFilter.type = 'lowpass';
    dropFilter.frequency.setValueAtTime(3000, now);
    dropFilter.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    dropGain.gain.setValueAtTime(0.4, now);
    dropGain.gain.exponentialRampToValueAtTime(0.15, now + 0.03);
    dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    dropOsc.start(now);
    dropOsc.stop(now + 0.2);

    // Resonance/ripple - the "bloop" echo after impact
    const rippleOsc = ctx.createOscillator();
    const rippleGain = ctx.createGain();

    rippleOsc.connect(rippleGain);
    rippleGain.connect(ctx.destination);

    rippleOsc.frequency.setValueAtTime(600, now + 0.02);
    rippleOsc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    rippleOsc.type = 'sine';

    rippleGain.gain.setValueAtTime(0, now);
    rippleGain.gain.linearRampToValueAtTime(0.15, now + 0.03);
    rippleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    rippleOsc.start(now + 0.02);
    rippleOsc.stop(now + 0.3);

    // Subtle bubble noise
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    const noiseSource = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1500;
    noiseFilter.Q.value = 1;
    noiseGain.gain.value = 0.08;

    noiseSource.start(now);
  },

  // Pulse - realistic heartbeat with lub-dub pattern
  pulse: (ctx) => {
    const now = ctx.currentTime;

    // "Lub" - first heart sound (S1) - lower, longer
    const lub = ctx.createOscillator();
    const lubGain = ctx.createGain();
    const lubFilter = ctx.createBiquadFilter();

    lub.connect(lubFilter);
    lubFilter.connect(lubGain);
    lubGain.connect(ctx.destination);

    lub.frequency.setValueAtTime(60, now);
    lub.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    lub.type = 'sine';

    lubFilter.type = 'lowpass';
    lubFilter.frequency.value = 150;

    lubGain.gain.setValueAtTime(0, now);
    lubGain.gain.linearRampToValueAtTime(0.6, now + 0.02);
    lubGain.gain.exponentialRampToValueAtTime(0.3, now + 0.08);
    lubGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    lub.start(now);
    lub.stop(now + 0.15);

    // Add subtle thump texture to lub
    const lubThump = ctx.createOscillator();
    const lubThumpGain = ctx.createGain();

    lubThump.connect(lubThumpGain);
    lubThumpGain.connect(ctx.destination);

    lubThump.frequency.setValueAtTime(80, now);
    lubThump.frequency.exponentialRampToValueAtTime(30, now + 0.05);
    lubThump.type = 'sine';

    lubThumpGain.gain.setValueAtTime(0.4, now);
    lubThumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    lubThump.start(now);
    lubThump.stop(now + 0.08);

    // "Dub" - second heart sound (S2) - higher, shorter, comes ~0.15s after lub
    const dub = ctx.createOscillator();
    const dubGain = ctx.createGain();
    const dubFilter = ctx.createBiquadFilter();

    dub.connect(dubFilter);
    dubFilter.connect(dubGain);
    dubGain.connect(ctx.destination);

    dub.frequency.setValueAtTime(90, now + 0.15);
    dub.frequency.exponentialRampToValueAtTime(50, now + 0.22);
    dub.type = 'sine';

    dubFilter.type = 'lowpass';
    dubFilter.frequency.value = 200;

    dubGain.gain.setValueAtTime(0, now + 0.15);
    dubGain.gain.linearRampToValueAtTime(0.45, now + 0.17);
    dubGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    dub.start(now + 0.15);
    dub.stop(now + 0.25);
  },

  // Digital - electronic blip
  digital: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.05);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  },

  // Bowl - singing bowl style
  bowl: (ctx) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.frequency.value = 256; // C4
    osc2.frequency.value = 512; // C5
    osc1.type = 'sine';
    osc2.type = 'sine';
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
  }
};

function playBeatSound() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Play the selected beat sound
  const soundFn = beatSounds[focusBeatSoundType] || beatSounds.soft;
  soundFn(ctx);

  // Update local count for immediate feedback (but relies on startTime for truth)
  focusBeatCount++;
}

function startFocusBeat(intervalSeconds, soundType = 'soft') {
  stopFocusBeat(false); // Stop loop, but don't clear storage yet

  focusBeatEnabled = true;
  focusBeatIntervalMs = intervalSeconds * 1000;
  focusBeatStartTime = Date.now();
  focusBeatCount = 0;
  focusBeatSoundType = soundType;

  playBeatSound();
  focusBeatInterval = setInterval(playBeatSound, focusBeatIntervalMs);

  // Persist state (with safety check)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.set({
        focusBeatState: {
          enabled: true,
          interval: intervalSeconds,
          startTime: focusBeatStartTime,
          soundType: soundType
        }
      });
    } catch (e) {
      console.error('[Tempo] Failed to save focus beat state', e);
    }
  }

  console.log('[Tempo] Focus Beat started, interval:', intervalSeconds, 's, sound:', soundType);
}

function stopFocusBeat(clearStorage = true) {
  if (focusBeatInterval) {
    clearInterval(focusBeatInterval);
    focusBeatInterval = null;
  }
  focusBeatEnabled = false;
  focusBeatCount = 0;
  focusBeatStartTime = null;

  if (clearStorage && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.remove('focusBeatState');
    } catch (e) {
      console.warn('[Tempo] Failed to clear focus beat state', e);
    }
  }

  console.log('[Tempo] Focus Beat stopped');
}

function getFocusBeatStatus() {
  let count = focusBeatCount;

  // If we have a start time, calculate the true count to ensure continuity
  if (focusBeatEnabled && focusBeatStartTime) {
    const elapsed = Date.now() - focusBeatStartTime;
    // Add 1 because count starts at 0 but the first beat plays at 0
    // Actually, usually users want "number of beats played".
    // At t=0, 1 played. t=3, 2 played.
    // So floor(elapsed/interval) + 1
    count = Math.floor(elapsed / focusBeatIntervalMs) + 1;
  }

  return {
    enabled: focusBeatEnabled,
    intervalMs: focusBeatIntervalMs,
    count: count,
    soundType: focusBeatSoundType
  };
}

// Restore state from storage on load
function restoreFocusBeatState() {
  // Safety check: ensure chrome.storage is available
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    console.log('[Tempo] Storage not available yet, will retry...');
    setTimeout(restoreFocusBeatState, 100);
    return;
  }

  chrome.storage.local.get(['focusBeatState'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('[Tempo] Failed to get focusBeatState:', chrome.runtime.lastError.message);
      return;
    }
    const state = result.focusBeatState;
    if (state && state.enabled) {
      console.log('[Tempo] Restoring Persisted Focus Beat...', state);
      focusBeatEnabled = true;
      focusBeatStartTime = state.startTime;
      focusBeatIntervalMs = state.interval * 1000;
      focusBeatSoundType = state.soundType || 'soft';

      // Calculate where we are in the cycle
      const now = Date.now();
      const elapsed = now - state.startTime;
      const nextBeatDelay = focusBeatIntervalMs - (elapsed % focusBeatIntervalMs);

      // Calculate current count
      focusBeatCount = Math.floor(elapsed / focusBeatIntervalMs);

      // Schedule next beat
      setTimeout(() => {
        if (!focusBeatEnabled) return; // Abort if stopped in meantime
        playBeatSound();
        focusBeatInterval = setInterval(playBeatSound, focusBeatIntervalMs);
      }, nextBeatDelay);
    }
  });
}

// Attempt restore after a small delay to ensure chrome APIs are ready
setTimeout(restoreFocusBeatState, 50);

// ============================================================================
// COMPLETION BEEP - Plays when timer completes
// ============================================================================

function playCompletionBeep() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Play a pleasant completion sound - triumphant chime sequence
  const playTone = (freq, startTime, duration, volume = 0.5) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const now = ctx.currentTime;
  // Triumphant ascending chime - louder and more distinct from beat sound
  playTone(523.25, now, 0.25, 0.6);         // C5
  playTone(659.25, now + 0.2, 0.25, 0.6);   // E5
  playTone(783.99, now + 0.4, 0.5, 0.7);    // G5 (longer, louder)
  playTone(1046.50, now + 0.7, 0.6, 0.5);   // C6 - high finish!

  console.log('[Tempo] Completion beep played');
}

// ============================================================================
// REMINDER BEEP - Plays for task due date reminders
// ============================================================================

function playReminderBeep() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Play an alert sound - two quick beeps
  const playTone = (freq, startTime, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const now = ctx.currentTime;
  // Two alert beeps
  playTone(880, now, 0.15);       // A5
  playTone(880, now + 0.2, 0.15); // A5 again

  console.log('[Tempo] Reminder beep played');
}

console.log('[Tempo] Offscreen audio engine loaded');
