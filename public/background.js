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
  console.log('[Tempo] sendToOffscreen called with:', message.action);
  ensureOffscreenDocument().then(() => {
    console.log('[Tempo] Offscreen document ready, sending message');
    // Allow time for offscreen document to initialize
    setTimeout(() => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[Tempo] Offscreen message failed:', chrome.runtime.lastError.message);
            // Retry once after a longer delay
            setTimeout(() => {
              chrome.runtime.sendMessage(message, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('[Tempo] Retry also failed:', chrome.runtime.lastError.message);
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  console.log('[Tempo] Retry succeeded:', retryResponse);
                  sendResponse(retryResponse || { success: false });
                }
              });
            }, 200);
          } else {
            console.log('[Tempo] Message sent successfully:', response);
            sendResponse(response || { success: false });
          }
        });
      } catch (e) {
        console.error('[Tempo] sendToOffscreen error:', e);
        sendResponse({ success: false, error: e.message });
      }
    }, 100);
  }).catch(e => {
    console.error('[Tempo] ensureOffscreenDocument error:', e);
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
    // Timer finished - get the original duration before clearing
    // Try to get duration from storage
    chrome.storage.local.get(['timerDuration'], async (data) => {
      const duration = data.timerDuration || 25;

      timerTargetTime = null;
      saveTimerState();
      chrome.alarms.clear('badgeTick');
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22C55E' });

      // Stop focus beat and focus sounds if running
      sendToOffscreen({
        target: 'offscreen-audio',
        action: 'focusBeat-stop'
      }, () => {});
      sendToOffscreen({
        target: 'offscreen-audio',
        action: 'stop'
      }, () => {});

      // IMPORTANT: Update stats in background when popup is closed!
      // This ensures stats are recorded even if popup isn't open
      try {
        const statsData = await chrome.storage.local.get('stats');
        const stats = statsData.stats || {
          totalSessions: 0,
          totalFocusMinutes: 0,
          currentStreak: 0,
          lastSessionDate: null,
          weeklyData: {}
        };

        const today = new Date().toISOString().split('T')[0];

        // Update streak
        if (stats.lastSessionDate) {
          const lastDate = new Date(stats.lastSessionDate);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
            stats.currentStreak = (stats.currentStreak || 0) + 1;
          } else if (stats.lastSessionDate !== today) {
            stats.currentStreak = 1;
          }
        } else {
          stats.currentStreak = 1;
        }

        stats.totalSessions = (stats.totalSessions || 0) + 1;
        stats.totalFocusMinutes = (stats.totalFocusMinutes || 0) + duration;
        stats.lastSessionDate = today;

        if (!stats.weeklyData) stats.weeklyData = {};
        stats.weeklyData[today] = (stats.weeklyData[today] || 0) + duration;

        await chrome.storage.local.set({ stats });
        // Also sync to sync storage
        try {
          await chrome.storage.sync.set({ stats });
        } catch (e) {
          console.log('[Tempo] Sync storage save failed:', e);
        }

        console.log('[Tempo] Stats updated from background:', stats);
      } catch (e) {
        console.error('[Tempo] Failed to update stats from background:', e);
      }

      // Open the alarm page - this is the main notification!
      chrome.tabs.create({
        url: `alarm.html?mode=focus&duration=${duration}`,
        active: true
      });

      // Also show Chrome notification as backup
      chrome.notifications.create('timerComplete-' + Date.now(), {
        type: 'basic',
        iconUrl: 'icons/icon128_v3.png',
        title: 'Focus Session Complete!',
        message: 'Great work! Time for a break.',
        priority: 2
      });

      // Clear badge after 10 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 10000);
    });
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
  if (alarm.name === 'taskReminderCheck') {
    checkTaskReminders();
  }
});

// ============================================================================
// TASK REMINDERS - Check for due tasks and show notifications
// ============================================================================

async function checkTaskReminders() {
  try {
    const data = await chrome.storage.local.get(['tasks']);
    const tasks = data.tasks || [];
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Get shown reminders from storage
    const reminderData = await chrome.storage.local.get(['shownReminders']);
    const shownReminders = reminderData.shownReminders || {};

    for (const task of tasks) {
      if (task.completed || !task.dueDate || !task.reminderEnabled) continue;

      // Check if snoozed
      if (task.snoozedUntil && new Date(task.snoozedUntil) > now) continue;

      const dueDate = new Date(task.dueDate);
      const reminderKey = `${task.id}_${task.dueDate}`;

      // Show reminder if task is due within 15 minutes or already overdue
      if (dueDate <= fifteenMinutesFromNow && !shownReminders[reminderKey]) {
        const isOverdue = dueDate < now;

        // Play notification sound
        sendToOffscreen({
          target: 'offscreen-audio',
          action: 'playReminderSound'
        }, () => {});

        // Show Chrome notification
        chrome.notifications.create('taskReminder-' + task.id + '-' + Date.now(), {
          type: 'basic',
          iconUrl: 'icons/icon128_v3.png',
          title: isOverdue ? 'Task Overdue!' : 'Task Due Soon',
          message: task.title,
          priority: 2,
          buttons: [
            { title: 'Snooze 15m' },
            { title: 'Mark Complete' }
          ],
          requireInteraction: true
        });

        // Mark as shown
        shownReminders[reminderKey] = Date.now();
        await chrome.storage.local.set({ shownReminders });
      }
    }

    // Clean up old reminder entries (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const cleanedReminders = {};
    for (const [key, timestamp] of Object.entries(shownReminders)) {
      if (timestamp > oneDayAgo) {
        cleanedReminders[key] = timestamp;
      }
    }
    if (Object.keys(cleanedReminders).length !== Object.keys(shownReminders).length) {
      await chrome.storage.local.set({ shownReminders: cleanedReminders });
    }
  } catch (e) {
    console.error('[Tempo] Task reminder check failed:', e);
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (!notificationId.startsWith('taskReminder-')) return;

  // Extract task ID from notification ID (format: taskReminder-{taskId}-{timestamp})
  const parts = notificationId.split('-');
  const taskId = parts[1];

  try {
    const data = await chrome.storage.local.get(['tasks']);
    let tasks = data.tasks || [];

    if (buttonIndex === 0) {
      // Snooze 15 minutes
      const snoozeUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      tasks = tasks.map(t => t.id === taskId ? { ...t, snoozedUntil: snoozeUntil } : t);

      // Clear the shown reminder so it can show again after snooze
      const reminderData = await chrome.storage.local.get(['shownReminders']);
      const shownReminders = reminderData.shownReminders || {};
      const task = tasks.find(t => t.id === taskId);
      if (task?.dueDate) {
        delete shownReminders[`${taskId}_${task.dueDate}`];
        await chrome.storage.local.set({ shownReminders });
      }
    } else if (buttonIndex === 1) {
      // Mark complete
      tasks = tasks.map(t => t.id === taskId ? { ...t, completed: true, updatedAt: Date.now() } : t);
    }

    await chrome.storage.local.set({ tasks });
  } catch (e) {
    console.error('[Tempo] Failed to handle notification action:', e);
  }

  chrome.notifications.clear(notificationId);
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

    // Get the mode and duration from the request (or use defaults)
    const mode = request.mode || 'focus';
    const duration = request.duration || 25;

    // Open the alarm page in a new tab - this is the main notification!
    chrome.tabs.create({
      url: `alarm.html?mode=${mode}&duration=${duration}`,
      active: true  // Bring to focus
    });

    // Also show a Chrome notification as backup (in case alarm page is blocked)
    chrome.notifications.create('timerComplete-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128_v3.png',
      title: mode === 'break' ? 'Break Complete!' : 'Focus Session Complete!',
      message: mode === 'break' ? 'Ready for another focus session?' : 'Great work! Time for a break.',
      priority: 2
    });

    // Set badge to checkmark
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22C55E' });

    // Clear badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 10000);

    sendResponse({ success: true });
    return;
  }

  if (request.action === 'startTimer') {
    const seconds = request.seconds || (request.minutes || 25) * 60;
    const durationMinutes = Math.round(seconds / 60);
    timerTargetTime = Date.now() + seconds * 1000;
    saveTimerState();
    // Save duration for stats recording when timer completes in background
    chrome.storage.local.set({ timerDuration: durationMinutes });
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

  // --- Alarm page actions (start break/focus from alarm page) ---
  if (request.action === 'startBreakFromAlarm' || request.action === 'startFocusFromAlarm') {
    // Store a flag that the popup should auto-start the timer when opened
    chrome.storage.local.set({
      autoStartFromAlarm: request.action === 'startBreakFromAlarm' ? 'break' : 'focus'
    });
    // Open the popup (extension can't directly start timers without popup)
    // The popup will read this flag and auto-start
    sendResponse({ success: true });
    return;
  }

  // --- Mini timer always on top ---
  if (request.action === 'setAlwaysOnTop') {
    // Get the sender's window ID and update it
    if (sender.tab && sender.tab.windowId) {
      chrome.windows.update(sender.tab.windowId, {
        focused: true,
        // Note: Chrome extensions can't directly set alwaysOnTop for regular windows
        // But the popup window created with type: 'popup' stays on top when focused
      });
    }
    sendResponse({ success: true });
    return;
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

  // Set up task reminder check alarm (every 1 minute)
  chrome.alarms.create('taskReminderCheck', { periodInMinutes: 1 });

  ensureOffscreenDocument();
});

chrome.runtime.onStartup.addListener(() => {
  ensureOffscreenDocument();
  // Restore timer state on browser startup
  loadTimerState();
});

// Also load timer state and ensure offscreen when service worker wakes up
loadTimerState();
ensureOffscreenDocument();
