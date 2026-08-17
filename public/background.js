// Tempo Focus - Background Service Worker

let offscreenCreated = false;
// NOTE: the "already recorded this session" guard deliberately lives in
// chrome.storage (see claimSessionCompletion), not in a module variable.
// Module state is wiped every time Chrome evicts the service worker.

// YouTube playback is handled by the offscreen document via iframe

// Create offscreen document for persistent audio playback
async function ensureOffscreenDocument() {
  if (offscreenCreated) return;

  try {
    // Safety check: ensure chrome.runtime and chrome.offscreen are available
    if (!chrome.runtime?.getContexts || !chrome.offscreen?.createDocument) {
      console.log('[Tempo] Chrome APIs not ready yet, deferring offscreen creation');
      return;
    }

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
      reasons: ['AUDIO_PLAYBACK', 'IFRAME_SCRIPTING'],
      justification: 'Play focus sounds and YouTube audio via iframe while extension popup is closed'
    });
    offscreenCreated = true;
    console.log('[Tempo] Offscreen audio document created');
  } catch (e) {
    // May already exist
    if (e.message?.includes('Only a single offscreen')) {
      offscreenCreated = true;
    } else if (e.message?.includes('No current')) {
      // Service worker not fully initialized - this is normal during startup
      console.log('[Tempo] Service worker initializing, will retry offscreen creation');
    } else {
      console.error('[Tempo] Failed to create offscreen document:', e);
    }
  }
}

// Check if offscreen document actually exists and is responsive
async function checkOffscreenExists() {
  try {
    if (!chrome.runtime?.getContexts) return false;
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });
    return contexts.length > 0;
  } catch (e) {
    return false;
  }
}

// Ping offscreen to verify it's responsive
function pingOffscreen() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 500);
    try {
      chrome.runtime.sendMessage({ target: 'offscreen-audio', action: 'ping' }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          resolve(response?.pong === true);
        }
      });
    } catch (e) {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

// Safe message forwarding to offscreen document with lastError handling
async function sendToOffscreen(message, sendResponse, retryCount = 0) {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 500;

  try {
    // First ensure offscreen document exists
    await ensureOffscreenDocument();

    // Double-check it actually exists
    const exists = await checkOffscreenExists();
    if (!exists) {
      offscreenCreated = false; // Reset flag
      if (retryCount < MAX_RETRIES) {
        console.log('[Tempo] Offscreen not found, recreating... retry:', retryCount);
        setTimeout(() => sendToOffscreen(message, sendResponse, retryCount + 1), RETRY_DELAY);
        return;
      } else {
        console.error('[Tempo] Could not create offscreen document');
        sendResponse({ success: false, error: 'Offscreen unavailable' });
        return;
      }
    }

    // On first attempt, ping to verify offscreen is responsive
    if (retryCount === 0) {
      const isResponsive = await pingOffscreen();
      if (!isResponsive) {
        console.log('[Tempo] Offscreen not responding to ping, retrying...');
        setTimeout(() => sendToOffscreen(message, sendResponse, retryCount + 1), RETRY_DELAY);
        return;
      }
    }

    // Send the message
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;

        // If receiving end doesn't exist, the offscreen might have been unloaded
        if (errorMsg.includes('Receiving end does not exist') || errorMsg.includes('Could not establish')) {
          offscreenCreated = false; // Reset flag so we recreate
          if (retryCount < MAX_RETRIES) {
            console.log('[Tempo] Offscreen disconnected, retrying...', retryCount);
            setTimeout(() => sendToOffscreen(message, sendResponse, retryCount + 1), RETRY_DELAY);
            return;
          }
        }

        if (retryCount >= MAX_RETRIES) {
          console.error('[Tempo] All retries failed:', errorMsg);
          sendResponse({ success: false, error: errorMsg });
        } else {
          setTimeout(() => sendToOffscreen(message, sendResponse, retryCount + 1), RETRY_DELAY);
        }
      } else {
        sendResponse(response || { success: true });
      }
    });
  } catch (e) {
    console.error('[Tempo] sendToOffscreen error:', e);
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => sendToOffscreen(message, sendResponse, retryCount + 1), RETRY_DELAY);
    } else {
      sendResponse({ success: false, error: e.message });
    }
  }
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
    if (!data.timerTargetTime) return;

    if (data.timerTargetTime > Date.now()) {
      timerTargetTime = data.timerTargetTime;
      updateTimerBadge();
      return;
    }

    // The timer expired while the service worker was asleep. Previously this
    // branch just cleared the badge, so the session was silently discarded —
    // no stats, no notification. Complete it properly instead. finishSession
    // is idempotent and suppresses the tab/notification if it is long stale.
    const expiredTarget = data.timerTargetTime;
    timerTargetTime = null;
    await chrome.storage.local.remove('timerTargetTime');
    await finishSession(expiredTarget, { openAlarmTab: true });
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

// A session that expired more than this long ago is credited to stats but does
// not pop a tab or a notification — the user has long since moved on.
const MISSED_COMPLETION_GRACE_MS = 5 * 60 * 1000;

/**
 * Claims the right to complete a given session, exactly once.
 *
 * Two independent paths can complete the same session (the badgeTick alarm and
 * the popup's `timerComplete` message). The previous guard was a module-level
 * boolean, which resets whenever Chrome evicts the service worker — so stats
 * could double-count and two alarm tabs could open. The claim now lives in
 * storage, so it survives eviction.
 *
 * @returns true if the caller should perform the completion.
 */
async function claimSessionCompletion(targetTime) {
  const key = targetTime || 0;
  const { completedSessionTarget } = await chrome.storage.local.get('completedSessionTarget');
  if (completedSessionTarget === key) return false;
  await chrome.storage.local.set({ completedSessionTarget: key });
  return true;
}

/** Records a finished session and tells the user about it, exactly once. */
async function finishSession(expiredTarget, options = {}) {
  const {
    openAlarmTab = true,
    mode: modeOverride,
    duration: durationOverride,
    templateBreakMinutes = null,
    templateFocusMinutes = null
  } = options;

  if (!(await claimSessionCompletion(expiredTarget))) return;

  const data = await chrome.storage.local.get(['timerDuration', 'timerMode']);
  // Storage is authoritative for duration: the popup may send the remaining
  // time rather than the full session length.
  const duration = data.timerDuration || durationOverride || 25;
  const mode = modeOverride || data.timerMode || 'focus';
  const isFocus = mode === 'focus';

  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#22C55E' });

  // Stop focus beat and focus sounds if running
  sendToOffscreen({ target: 'offscreen-audio', action: 'focusBeat-stop' }, () => {});
  sendToOffscreen({ target: 'offscreen-audio', action: 'stop' }, () => {});

  if (isFocus) {
    const sessionData = await chrome.storage.local.get('sessionCount');
    const newSessionCount = (sessionData.sessionCount || 0) + 1;
    await chrome.storage.local.set({ sessionCount: newSessionCount });

    try {
      const statsData = await chrome.storage.local.get('stats');
      const stats = recordFocusSession(statsData.stats, duration);
      await chrome.storage.local.set({ stats });
      try {
        await chrome.storage.sync.set({ stats: { ...stats, weeklyData: prunedWeeklyData(stats.weeklyData) } });
      } catch (e) {
        console.warn('[Tempo] Cross-device stats sync failed:', e);
      }
    } catch (e) {
      console.error('[Tempo] Failed to update stats:', e);
    }

    // Precompute break info for the alarm page.
    try {
      const settingsData = await chrome.storage.sync.get(['settings']);
      const settings = settingsData.settings || {};
      const longBreakInterval = settings.longBreakInterval || 4;
      const isLongBreak =
        longBreakInterval > 0 && newSessionCount > 0 && newSessionCount % longBreakInterval === 0;
      // The active template's break length wins over the global short break.
      const shortBreak = templateBreakMinutes || settings.shortBreak || 5;
      await chrome.storage.local.set({
        nextBreakDuration: isLongBreak ? (settings.longBreak || 15) : shortBreak,
        nextBreakIsLong: isLongBreak,
        templateFocusMinutes: templateFocusMinutes || duration
      });
    } catch (e) {
      console.error('[Tempo] Failed to store break info:', e);
    }
  }

  // If the worker was asleep when the timer expired, we still credit the
  // session above, but we do not hijack the user's screen long afterwards.
  const lateBy = Date.now() - (expiredTarget || Date.now());
  const isStale = lateBy > MISSED_COMPLETION_GRACE_MS;
  if (isStale) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  if (openAlarmTab) {
    chrome.tabs.create({ url: `alarm.html?mode=${mode}&duration=${duration}`, active: true });
  }

  chrome.notifications.create('timerComplete-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon128_v4.png',
    title: isFocus ? 'Focus Session Complete!' : 'Break Complete!',
    message: isFocus ? 'Great work! Time for a break.' : 'Ready for another focus session?',
    priority: 2
  });

  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 10000);
}

/** Applies one completed focus session to a stats object. Pure. */
function recordFocusSession(existing, durationMinutes) {
  const stats = existing || {
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    lastSessionDate: null,
    weeklyData: {}
  };

  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  if (!stats.lastSessionDate) {
    stats.currentStreak = 1;
  } else if (stats.lastSessionDate === yesterdayStr) {
    stats.currentStreak = (stats.currentStreak || 0) + 1;
  } else if (stats.lastSessionDate !== today) {
    stats.currentStreak = 1;
  }

  stats.totalSessions = (stats.totalSessions || 0) + 1;
  stats.totalFocusMinutes = (stats.totalFocusMinutes || 0) + durationMinutes;
  stats.lastSessionDate = today;

  if (!stats.weeklyData) stats.weeklyData = {};
  stats.weeklyData[today] = (stats.weeklyData[today] || 0) + durationMinutes;

  return stats;
}

/** Trims synced history so it stays under chrome.storage.sync's 8KB item cap. */
function prunedWeeklyData(weeklyData, days = 90) {
  if (!weeklyData) return {};
  const recent = Object.keys(weeklyData).sort().slice(-days);
  return Object.fromEntries(recent.map(date => [date, weeklyData[date]]));
}

// Update badge text based on remaining time
function updateTimerBadge() {
  if (!timerTargetTime) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const remaining = Math.ceil((timerTargetTime - Date.now()) / 1000);
  if (remaining <= 0) {
    const expiredTarget = timerTargetTime;
    timerTargetTime = null;
    saveTimerState();
    chrome.alarms.clear('badgeTick');
    finishSession(expiredTarget, { openAlarmTab: true }).catch(e =>
      console.error('[Tempo] Failed to finish session:', e)
    );
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
  if (alarm.name.startsWith(HEALTH_ALARM_PREFIX)) {
    fireHealthReminder(alarm.name.slice(HEALTH_ALARM_PREFIX.length));
  }
});

// ============================================================================
// HEALTH REMINDERS - hydration, posture, eye rest, stretch, screen breaks
// ============================================================================
//
// These used to run as setInterval timers inside the React popup. A popup is
// destroyed the moment it loses focus, and the default interval is 30 minutes,
// so in practice the reminders never fired for anyone. They belong to the
// service worker, driven by chrome.alarms, which survive popup closure and
// browser restarts.

const HEALTH_ALARM_PREFIX = 'health:';

const HEALTH_TIPS = {
  screen_break: { title: 'Screen Break', message: 'Look away from your screen and rest your eyes.' },
  water: { title: 'Drink Water', message: 'Stay hydrated — grab a glass of water.' },
  stretch: { title: 'Time to Stretch', message: 'Stand up and stretch for a minute.' },
  eye_rest: { title: 'Eye Rest (20-20-20)', message: 'Look at something 20 feet away for 20 seconds.' },
  posture: { title: 'Posture Check', message: 'Sit up straight and relax your shoulders.' }
};

/** Rebuilds the health alarm set from the user's saved settings. */
async function syncHealthAlarms() {
  try {
    // Clear any existing health alarms so removed/disabled types stop firing.
    const existing = await chrome.alarms.getAll();
    await Promise.all(
      existing
        .filter(a => a.name.startsWith(HEALTH_ALARM_PREFIX))
        .map(a => chrome.alarms.clear(a.name))
    );

    const { healthSettings } = await chrome.storage.sync.get('healthSettings');
    if (!healthSettings || healthSettings.enabled === false) return;

    for (const [typeId, config] of Object.entries(healthSettings.types || {})) {
      if (!config?.enabled || !HEALTH_TIPS[typeId]) continue;
      if ((config.reminderCount || 0) <= 0) continue;

      // chrome.alarms rejects periods below 30 seconds; keep a sane floor.
      const periodInMinutes = Math.max(1, Number(config.intervalMinutes) || 30);
      chrome.alarms.create(HEALTH_ALARM_PREFIX + typeId, { periodInMinutes, delayInMinutes: periodInMinutes });
    }
  } catch (e) {
    console.error('[Tempo] Failed to sync health alarms:', e);
  }
}

/** Shows one health reminder, respecting the per-day cap for that type. */
async function fireHealthReminder(typeId) {
  try {
    const tip = HEALTH_TIPS[typeId];
    if (!tip) return;

    const { healthSettings } = await chrome.storage.sync.get('healthSettings');
    const config = healthSettings?.types?.[typeId];
    if (!healthSettings?.enabled || !config?.enabled) return;

    // Counts reset each day so "3 reminders" means 3 per day, not 3 ever.
    const today = new Date().toLocaleDateString('en-CA');
    const { healthReminderCounts } = await chrome.storage.local.get('healthReminderCounts');
    const counts = healthReminderCounts?.date === today
      ? healthReminderCounts
      : { date: today };

    const shown = counts[typeId] || 0;
    if (shown >= (config.reminderCount || 0)) return;

    chrome.notifications.create(`health-${typeId}-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128_v4.png',
      title: tip.title,
      message: `${tip.message} (${shown + 1}/${config.reminderCount})`,
      priority: 1
    });

    counts[typeId] = shown + 1;
    await chrome.storage.local.set({ healthReminderCounts: counts });
  } catch (e) {
    console.error('[Tempo] Failed to fire health reminder:', e);
  }
}

// Re-register alarms whenever the user changes their health settings.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.healthSettings) {
    syncHealthAlarms();
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
          iconUrl: 'icons/icon128_v4.png',
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

  // Extract task ID from notification ID (format: taskReminder-{taskId}-{timestamp}).
  // Task ids themselves contain hyphens ('task-<ts>-<rand>', 'google-<id>'), so
  // splitting on '-' and taking [1] yielded the literal string 'task' and every
  // button click silently matched no task. Take everything between the prefix
  // and the final '-' instead.
  const PREFIX = 'taskReminder-';
  const taskId = notificationId.slice(PREFIX.length, notificationId.lastIndexOf('-'));
  if (!taskId) return;

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

  // --- YouTube commands (forwarded to offscreen document) ---
  if (request.action === 'youtube-play') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'youtube-play',
      videoId: request.videoId
    }, sendResponse);
    return true;
  }

  if (request.action === 'youtube-stop') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'youtube-stop'
    }, sendResponse);
    return true;
  }

  if (request.action === 'youtube-status') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'youtube-status'
    }, sendResponse);
    return true;
  }

  if (request.action === 'youtube-volume') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'youtube-volume',
      volume: request.volume
    }, sendResponse);
    return true;
  }

  if (request.action === 'youtube-pause') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'youtube-pause'
    }, sendResponse);
    return true;
  }

  if (request.action === 'youtube-resume') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'youtube-resume'
    }, sendResponse);
    return true;
  }

  // --- Focus Beat commands ---
  if (request.action === 'focusBeat-start') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'focusBeat-start',
      intervalSeconds: request.intervalSeconds || 1,
      soundType: request.soundType || 'soft'
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

  if (request.action === 'focusBeat-changeSoundType') {
    sendToOffscreen({
      target: 'offscreen-audio',
      action: 'focusBeat-changeSoundType',
      soundType: request.soundType || 'soft'
    }, sendResponse);
    return true;
  }

  // --- Timer commands ---

  if (request.action === 'timerComplete') {
    // The popup noticed the session ended. The badgeTick alarm may notice the
    // same session independently, so both paths funnel into finishSession(),
    // which claims each session exactly once via chrome.storage. Previously
    // both ran, opening two alarm tabs and two notifications — and, if Chrome
    // had evicted the worker in between, counting the session twice.
    (async () => {
      // The in-memory target is lost whenever the worker restarts, so fall
      // back to storage to identify which session this is.
      const stored = await chrome.storage.local.get('timerTargetTime');
      const expiredTarget = timerTargetTime || stored.timerTargetTime || 0;

      timerTargetTime = null;
      saveTimerState();
      chrome.alarms.clear('badgeTick');

      await finishSession(expiredTarget, {
        openAlarmTab: true,
        mode: request.mode || 'focus',
        duration: request.duration || 25,
        templateBreakMinutes: request.templateBreakMinutes || null,
        templateFocusMinutes: request.templateFocusMinutes || null
      });
    })().catch(e => console.error('[Tempo] Failed to finish session:', e));

    sendResponse({ success: true });
    return;
  }

  if (request.action === 'startTimer') {
    const seconds = request.seconds || (request.minutes || 25) * 60;
    const durationMinutes = Math.round(seconds / 60);
    timerTargetTime = Date.now() + seconds * 1000;
    // Clear any previous completion claim so this new session can be recorded.
    chrome.storage.local.remove('completedSessionTarget');
    saveTimerState();
    // Only save timerDuration for fresh starts (not restores from popup reopening)
    // When popup restores a timer, it sends remaining seconds which would overwrite
    // the original duration (e.g., 1 min remaining on a 25 min session)
    if (!request.isRestore) {
      const saveData = { timerDuration: durationMinutes };
      if (request.mode) saveData.timerMode = request.mode;
      chrome.storage.local.set(saveData);
    }
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
    const isBreak = request.action === 'startBreakFromAlarm';

    // Get user settings and session count to determine duration
    chrome.storage.sync.get(['settings'], async (data) => {
      const settings = data.settings || {};
      let durationMinutes;

      if (isBreak) {
        // Use pre-computed break duration from timerComplete handler if available
        const breakData = await chrome.storage.local.get(['nextBreakDuration', 'nextBreakIsLong', 'sessionCount']);
        if (breakData.nextBreakDuration) {
          durationMinutes = breakData.nextBreakDuration;
          console.log('[Tempo] Break from alarm: using pre-computed duration=', durationMinutes, 'isLong=', breakData.nextBreakIsLong);
        } else {
          // Fallback: compute from settings
          const longBreakInterval = settings.longBreakInterval || 4;
          const longBreakDuration = settings.longBreak || 15;
          const shortBreakDuration = settings.shortBreak || 5;
          const sessionCount = breakData.sessionCount || 0;
          const isLongBreak = longBreakInterval > 0 && sessionCount > 0 && sessionCount % longBreakInterval === 0;
          durationMinutes = isLongBreak ? longBreakDuration : shortBreakDuration;
          console.log('[Tempo] Break from alarm: computed duration=', durationMinutes, 'isLong=', isLongBreak);
        }
      } else {
        // Use template focus duration if stored, otherwise fall back to global settings
        const focusData = await chrome.storage.local.get(['templateFocusMinutes']);
        durationMinutes = focusData.templateFocusMinutes || settings.focusDuration || 25;
        console.log('[Tempo] Focus from alarm: duration=', durationMinutes, 'templateFocus=', focusData.templateFocusMinutes);
      }

      const seconds = durationMinutes * 60;

      // Start the timer directly from background script
      timerTargetTime = Date.now() + seconds * 1000;
      saveTimerState();

      // Save duration and mode for the popup to sync with
      chrome.storage.local.set({
        timerDuration: durationMinutes,
        timerMode: isBreak ? 'break' : 'focus',
        timerInitialTime: seconds,
        timerIsActive: true
      });

      // Start badge updates
      chrome.alarms.create('badgeTick', { periodInMinutes: 0.5 });
      updateTimerBadge();

      console.log(`[Tempo] Started ${isBreak ? 'break' : 'focus'} timer from alarm page: ${durationMinutes} minutes`);
    });

    sendResponse({ success: true });
    return true; // Keep message channel open for async response
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
  syncHealthAlarms();

  ensureOffscreenDocument();
});

chrome.runtime.onStartup.addListener(() => {
  ensureOffscreenDocument();
  // Restore timer state on browser startup
  loadTimerState();
  syncHealthAlarms();
});

// Also load timer state and ensure offscreen when service worker wakes up
// Use setTimeout to ensure Chrome APIs are fully initialized
setTimeout(() => {
  loadTimerState();
  ensureOffscreenDocument();
}, 100);
