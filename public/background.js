// Tempo Focus - Background Service Worker

let offscreenCreated = false;

// Create offscreen document for persistent audio playback
async function ensureOffscreenDocument() {
  if (offscreenCreated) return;

  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      offscreenCreated = true;
      return;
    }

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play focus sounds (binaural beats, noise, tones) while extension popup is closed'
    });
    offscreenCreated = true;
    console.log('[Tempo] Offscreen audio document created');
  } catch (e) {
    // May already exist
    if (e.message?.includes('Only a single offscreen')) {
      offscreenCreated = true;
    } else {
      console.error('[Tempo] Failed to create offscreen document:', e);
    }
  }
}

// Safe message forwarding to offscreen document with lastError handling
function sendToOffscreen(message, sendResponse) {
  ensureOffscreenDocument().then(() => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Tempo] Offscreen message failed:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response || { success: false });
        }
      });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }).catch(e => {
    sendResponse({ success: false, error: e.message });
  });
}

// ============================================================================
// TIMER BADGE - Real-time countdown on extension icon
// ============================================================================

// Restore timer target from storage on service worker wake
let timerTargetTime = null;

// Load persisted timer target on startup
async function loadTimerState() {
  // Check if chrome.storage is available
  if (!chrome.storage || !chrome.storage.local) {
    console.log('[Tempo] Storage not available yet, will retry on next wake');
    return;
  }

  try {
    const data = await chrome.storage.local.get(['timerTargetTime']);
    if (data.timerTargetTime && data.timerTargetTime > Date.now()) {
      timerTargetTime = data.timerTargetTime;
      updateTimerBadge();
    } else if (data.timerTargetTime) {
      // Timer already expired while service worker was asleep
      chrome.storage.local.remove('timerTargetTime');
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    // This can happen during service worker initialization - it's normal
    console.log('[Tempo] Timer state will load on next event');
  }
}

// Save timer target to persistent storage
function saveTimerState() {
  if (timerTargetTime) {
    chrome.storage.local.set({ timerTargetTime });
  } else {
    chrome.storage.local.remove('timerTargetTime');
  }
}

// Update badge text based on remaining time
function updateTimerBadge() {
  if (!timerTargetTime) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const remaining = Math.ceil((timerTargetTime - Date.now()) / 1000);
  if (remaining <= 0) {
    // Timer finished
    timerTargetTime = null;
    saveTimerState();
    chrome.alarms.clear('badgeTick');
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22C55E' });

    // Play completion sound via offscreen document
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'playCompletionSound'
    }, () => {});

    // Show Chrome notification
    chrome.notifications.create('timerComplete-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128_v3.png',
      title: 'Focus Session Complete!',
      message: 'Great work! Time for a break.',
      priority: 2
    });

    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 5000);
    return;
  }

  const mins = Math.ceil(remaining / 60);
  const text = mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
}

// Badge tick alarm - fires every 30 seconds (Chrome MV3 minimum is ~30s)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'badgeTick') {
    updateTimerBadge();
  }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ignore messages targeted at offscreen (avoid re-processing in background)
  if (request.target === 'offscreen-audio') {
    return false;
  }

  // Audio control commands from popup
  if (request.action === 'audio-play') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'play',
      trackId: request.trackId,
      volume: request.volume,
      range: request.range
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-stop') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'stop'
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-volume') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'setVolume',
      volume: request.volume
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-range') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'switchRange',
      trackId: request.trackId,
      range: request.range
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-status') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'getStatus'
    }, sendResponse);
    return true;
  }

  // --- Focus Beat commands ---
  if (request.action === 'focusBeat-start') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'focusBeat-start',
      intervalSeconds: request.intervalSeconds || 1
    }, sendResponse);
    return true;
  }

  if (request.action === 'focusBeat-stop') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'focusBeat-stop'
    }, sendResponse);
    return true;
  }

  if (request.action === 'focusBeat-status') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'focusBeat-status'
    }, sendResponse);
    return true;
  }

  // --- Timer commands ---

  if (request.action === 'timerComplete') {
    timerTargetTime = null;
    saveTimerState();
    chrome.alarms.clear('badgeTick');

    // Play completion sound via offscreen document
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'playCompletionSound'
    }, () => {});

    // Show Chrome notification
    chrome.notifications.create('timerComplete-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128_v3.png',
      title: 'Focus Session Complete!',
      message: 'Great work! Time for a break.',
      priority: 2
    });
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'startTimer') {
    const seconds = request.seconds || (request.minutes || 25) * 60;
    timerTargetTime = Date.now() + seconds * 1000;
    saveTimerState();
    // Alarm fires every 30 seconds to update badge (Chrome MV3 min ~30s)
    chrome.alarms.create('badgeTick', { periodInMinutes: 0.5 });
    updateTimerBadge();
    sendResponse({ success: true });
  }

  if (request.action === 'updateBadge') {
    if (request.targetTime) {
      timerTargetTime = request.targetTime;
      saveTimerState();
    }
    updateTimerBadge();
    sendResponse({ success: true });
  }

  if (request.action === 'stopTimer') {
    timerTargetTime = null;
    saveTimerState();
    chrome.alarms.clear('badgeTick');
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
  }

  // --- Pro status ---

  if (request.action === 'checkProStatus') {
    chrome.storage.sync.get(['isPro', 'proExpiry', 'licenseKey'], (data) => {
      const now = Date.now();
      const isValid = data.isPro && (!data.proExpiry || data.proExpiry > now);
      sendResponse({ isPro: isValid, licenseKey: data.licenseKey });
    });
    return true;
  }

  if (request.action === 'activatePro') {
    chrome.storage.sync.set({
      isPro: true,
      proExpiry: request.expiry || null,
      licenseKey: request.licenseKey || null,
      activatedAt: Date.now()
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'deactivatePro') {
    chrome.storage.sync.set({
      isPro: false,
      proExpiry: null,
      licenseKey: null
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// ============================================================================
// LIFECYCLE
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      isPro: false,
      settings: {
        focusDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        autoStartBreaks: false,
        notifications: true,
        darkMode: true
      }
    });

    chrome.storage.local.set({
      stats: {
        totalSessions: 0,
        totalFocusMinutes: 0,
        currentStreak: 0,
        lastSessionDate: null
      }
    });
  }

  ensureOffscreenDocument();
});

chrome.runtime.onStartup.addListener(() => {
  ensureOffscreenDocument();
  // Restore timer state on browser startup
  loadTimerState();
});

// Also load timer state when service worker wakes up
loadTimerState();
