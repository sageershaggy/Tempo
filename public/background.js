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

// Timer alarm handling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusTimer') {
    // Show notification when timer ends
    chrome.notifications.create('timerComplete', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Focus Session Complete!',
      message: 'Great work! Time for a break.',
      priority: 2
    });

    // Update badge
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#7F13EC' });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Audio playback messages - relay to offscreen document
  if (request.target === 'offscreen-audio') {
    ensureOffscreenDocument().then(() => {
      // Forward the message to offscreen
      chrome.runtime.sendMessage(request, (response) => {
        sendResponse(response);
      });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  // Audio control commands from popup
  if (request.action === 'audio-play') {
    ensureOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({
        target: 'offscreen-audio',
        action: 'play',
        trackId: request.trackId,
        volume: request.volume,
        range: request.range
      }, sendResponse);
    });
    return true;
  }

  if (request.action === 'audio-stop') {
    chrome.runtime.sendMessage({
      target: 'offscreen-audio',
      action: 'stop'
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-volume') {
    chrome.runtime.sendMessage({
      target: 'offscreen-audio',
      action: 'setVolume',
      volume: request.volume
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-range') {
    chrome.runtime.sendMessage({
      target: 'offscreen-audio',
      action: 'switchRange',
      trackId: request.trackId,
      range: request.range
    }, sendResponse);
    return true;
  }

  if (request.action === 'audio-status') {
    chrome.runtime.sendMessage({
      target: 'offscreen-audio',
      action: 'getStatus'
    }, sendResponse);
    return true;
  }

  if (request.action === 'startTimer') {
    const minutes = request.minutes || 25;
    chrome.alarms.create('focusTimer', { delayInMinutes: minutes });
    chrome.action.setBadgeText({ text: `${minutes}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
    sendResponse({ success: true });
  }

  if (request.action === 'stopTimer') {
    chrome.alarms.clear('focusTimer');
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
  }

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

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default values
    chrome.storage.sync.set({
      isPro: false,
      settings: {
        focusDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        autoStartBreaks: false,
        notifications: true,
        darkMode: true
      },
      stats: {
        totalSessions: 0,
        totalFocusMinutes: 0,
        currentStreak: 0,
        lastSessionDate: null
      }
    });
  }

  // Pre-create offscreen document for audio
  ensureOffscreenDocument();
});

// Also create offscreen on startup
chrome.runtime.onStartup.addListener(() => {
  ensureOffscreenDocument();
});
