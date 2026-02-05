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
  console.log('[Tempo Offscreen] Received message:', message);
  if (message.target !== 'offscreen-audio') {
    console.log('[Tempo Offscreen] Ignoring - not targeted at offscreen-audio');
    return;
  }

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
      startFocusBeat(message.intervalSeconds || 1);
      sendResponse({ success: true, ...getFocusBeatStatus() });
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

function playBeatSound() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 220;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);

  // Update local count for immediate feedback (but relies on startTime for truth)
  focusBeatCount++;
}

function startFocusBeat(intervalSeconds) {
  stopFocusBeat(false); // Stop loop, but don't clear storage yet

  focusBeatEnabled = true;
  focusBeatIntervalMs = intervalSeconds * 1000;
  focusBeatStartTime = Date.now();
  focusBeatCount = 0;

  playBeatSound();
  focusBeatInterval = setInterval(playBeatSound, focusBeatIntervalMs);

  // Persist state (with safety check)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.set({
        focusBeatState: {
          enabled: true,
          interval: intervalSeconds,
          startTime: focusBeatStartTime
        }
      });
    } catch (e) {
      console.error('[Tempo] Failed to save focus beat state', e);
    }
  }

  console.log('[Tempo] Focus Beat started, interval:', intervalSeconds, 's');
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
    count: count
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
