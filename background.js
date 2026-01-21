// Tempo Focus - Background Service Worker

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
    return true; // Keep channel open for async response
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
});
