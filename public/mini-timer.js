// Mini Timer - a small floating readout of the current Tempo session.
//
// Timer state has two writers: the popup (TimerScreen) writes localStorage, and
// the MV3 service worker owns chrome.storage.local.timerTargetTime. The service
// worker is authoritative for a running session because it keeps counting with
// every extension page closed, so we prefer it and fall back to localStorage.

const container = document.getElementById('container');
const timerEl = document.getElementById('timer');
const modeLabel = document.getElementById('modeLabel');
const pulseDot = document.getElementById('pulseDot');
const closeBtn = document.getElementById('closeBtn');
const pinBtn = document.getElementById('pinBtn');

const STORAGE_KEYS = {
  TIMER_TARGET: 'tempo_timer_target',
  TIMER_ACTIVE: 'tempo_timer_active',
  TIMER_MODE: 'tempo_timer_mode'
};

const PIP_SIZE = { width: 300, height: 104 };

const hasChrome = typeof chrome !== 'undefined';
let currentWindowId = null;
let pipWindow = null;

// Mirror of chrome.storage.local, refreshed on change so the render path stays
// synchronous and can run on a tick.
let swState = { target: null, mode: null };

if (hasChrome && chrome.windows) {
  chrome.windows.getCurrent((win) => { currentWindowId = win && win.id; });
}

if (hasChrome && chrome.storage) {
  chrome.storage.local.get(['timerTargetTime', 'timerMode'], (data) => {
    swState = { target: data.timerTargetTime || null, mode: data.timerMode || null };
    updateTimer();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('timerTargetTime' in changes) swState.target = changes.timerTargetTime.newValue || null;
    if ('timerMode' in changes) swState.mode = changes.timerMode.newValue || null;
    updateTimer();
  });
}

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  // Long sessions (90/20 and custom) can exceed an hour; show H:MM:SS then.
  return hrs > 0 ? hrs + ':' + pad(mins) + ':' + pad(secs) : pad(mins) + ':' + pad(secs);
}

/** Resolves the session from whichever store is authoritative right now. */
function readSession() {
  const mode = swState.mode || localStorage.getItem(STORAGE_KEYS.TIMER_MODE) || 'focus';
  const now = Date.now();

  if (swState.target && swState.target > now) {
    return { state: 'running', remaining: Math.ceil((swState.target - now) / 1000), mode };
  }

  const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
  const isActive = localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true';
  if (!savedTarget) return { state: 'idle', remaining: 0, mode };

  const remaining = Math.ceil((parseInt(savedTarget, 10) - now) / 1000);
  if (remaining <= 0) return { state: isActive ? 'done' : 'idle', remaining: 0, mode };
  return { state: isActive ? 'running' : 'paused', remaining, mode };
}

function updateTimer() {
  const session = readSession();
  const isBreak = session.mode === 'break';

  document.documentElement.style.setProperty('--theme-color', isBreak ? '#22C55E' : '#7F13EC');
  pulseDot.classList.toggle('break-mode', isBreak);
  modeLabel.classList.toggle('break-mode', isBreak);

  const idle = session.state === 'idle';
  const running = session.state === 'running';

  container.classList.toggle('no-timer', idle);
  pulseDot.classList.toggle('paused', !running);
  timerEl.classList.toggle('active', running);
  timerEl.classList.toggle('paused', !running);
  modeLabel.classList.toggle('paused', !running);

  if (idle) {
    timerEl.textContent = 'Ready';
    modeLabel.textContent = 'No session';
    return;
  }

  timerEl.textContent = formatTime(session.remaining);
  if (session.state === 'done') modeLabel.textContent = 'Complete';
  else if (session.state === 'paused') modeLabel.textContent = isBreak ? 'Break paused' : 'Paused';
  else modeLabel.textContent = isBreak ? 'Break' : 'Focus';
}

// --- Always on top -------------------------------------------------------
//
// A chrome.windows popup cannot be pinned above other applications; Chrome
// exposes no always-on-top flag for them. The previous implementation faked it
// with a 500ms setInterval calling chrome.windows.update({focused:true}), which
// yanked focus away mid-keystroke from whatever the user was actually doing.
//
// Document Picture-in-Picture is the one surface Chrome floats above every
// other window, so the pin uses that and leaves focus alone.

const supportsPiP = 'documentPictureInPicture' in window;

if (!supportsPiP) {
  pinBtn.title = 'Always on top needs Chrome 116 or newer';
  pinBtn.setAttribute('aria-label', pinBtn.title);
}

async function enterPiP() {
  // The PiP window is owned by this document, so this window must stay alive.
  // Minimise it instead of closing it, otherwise the float dies with its opener.
  pipWindow = await window.documentPictureInPicture.requestWindow(PIP_SIZE);

  document.querySelectorAll('style').forEach((styleEl) => {
    pipWindow.document.head.appendChild(styleEl.cloneNode(true));
  });
  pipWindow.document.body.classList.add('pip-host');
  pipWindow.document.body.appendChild(container);

  pinBtn.classList.add('pinned');
  pinBtn.title = 'Stop floating on top';
  pinBtn.setAttribute('aria-label', pinBtn.title);

  if (currentWindowId && hasChrome && chrome.windows) {
    chrome.windows.update(currentWindowId, { state: 'minimized' });
  }

  pipWindow.addEventListener('pagehide', exitPiP, { once: true });
}

function exitPiP() {
  // Bring the UI home before the PiP document goes away, or the node is lost.
  document.body.appendChild(container);
  pipWindow = null;

  pinBtn.classList.remove('pinned');
  pinBtn.title = 'Keep on top of other windows';
  pinBtn.setAttribute('aria-label', pinBtn.title);

  if (currentWindowId && hasChrome && chrome.windows) {
    chrome.windows.update(currentWindowId, { state: 'normal', focused: true });
  }
}

pinBtn.addEventListener('click', async (e) => {
  e.stopPropagation();

  if (pipWindow) { pipWindow.close(); return; }

  if (!supportsPiP) {
    // Nothing honest to do here - say so rather than stealing focus.
    pinBtn.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' },
       { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
      { duration: 220 }
    );
    return;
  }

  try {
    await enterPiP();
  } catch (err) {
    console.warn('[Tempo] Could not open the floating window:', err);
    if (!document.body.contains(container)) document.body.appendChild(container);
  }
});

closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (pipWindow) pipWindow.close();
  window.close();
});

// Double-click anywhere opens the full app.
container.addEventListener('dblclick', () => {
  if (hasChrome && chrome.runtime) window.open(chrome.runtime.getURL('index.html'));
});

updateTimer();
setInterval(updateTimer, 500);

// Catches writes from the popup, which uses localStorage.
window.addEventListener('storage', (e) => {
  if (!e.key || e.key.indexOf('tempo_timer_') === 0) updateTimer();
});
