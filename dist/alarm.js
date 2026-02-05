// Tempo Focus - Alarm Page Script

// Get mode from URL params
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') || 'focus'; // 'focus' or 'break'
const duration = params.get('duration') || '25';

// Elements
const body = document.body;
const title = document.getElementById('title');
const message = document.getElementById('message');
const sessionInfo = document.getElementById('sessionInfo');
const mainIcon = document.getElementById('mainIcon');
const startBtn = document.getElementById('startBtn');
const startIcon = document.getElementById('startIcon');
const startText = document.getElementById('startText');
const closeBtn = document.getElementById('closeBtn');
const backLink = document.getElementById('backLink');
const rateBtn = document.getElementById('rateBtn');

// Configure based on mode
if (mode === 'break') {
  // Break completed - ready for focus
  body.classList.add('break-mode');
  title.textContent = 'Break Complete!';
  message.textContent = 'Ready for another focus session?';
  sessionInfo.innerHTML = `Your <strong>${duration} minute</strong> break is over`;
  mainIcon.textContent = 'rocket_launch';
  startIcon.textContent = 'play_arrow';
  startText.textContent = 'Start Focus';
} else {
  // Focus completed - ready for break
  title.textContent = 'Focus Session Complete!';
  message.textContent = 'Great work! You\'ve earned a break.';
  sessionInfo.innerHTML = `You completed <strong>${duration} minutes</strong> of focused work`;
  mainIcon.textContent = 'celebration';
  startIcon.textContent = 'coffee';
  startText.textContent = 'Start Break';
}

// Play completion sound
function playSound() {
  try {
    const ctx = new AudioContext();
    const playTone = (freq, startTime, dur, vol = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };
    const now = ctx.currentTime;
    // Triumphant chime
    playTone(523.25, now, 0.25, 0.5);
    playTone(659.25, now + 0.2, 0.25, 0.5);
    playTone(783.99, now + 0.4, 0.5, 0.6);
    playTone(1046.50, now + 0.7, 0.6, 0.4);
  } catch (e) {
    console.log('Audio not available');
  }
}

// Play sound on load
setTimeout(playSound, 300);

// Button handlers
closeBtn.addEventListener('click', () => {
  // Just close this tab
  window.close();
});

startBtn.addEventListener('click', () => {
  // Tell the extension to start the next session
  if (chrome?.runtime?.sendMessage) {
    const action = mode === 'break' ? 'startFocusFromAlarm' : 'startBreakFromAlarm';
    console.log('[Tempo] Sending action:', action);
    chrome.runtime.sendMessage({ action }, (response) => {
      console.log('[Tempo] Response:', response);
      window.close();
    });
  } else {
    console.log('[Tempo] Chrome runtime not available');
    window.close();
  }
});

backLink.addEventListener('click', () => {
  window.close();
});

rateBtn.addEventListener('click', () => {
  // Open Chrome Web Store rating page (update URL when published)
  window.open('https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID/reviews', '_blank');
});

// Auto-close after 5 minutes of inactivity
setTimeout(() => {
  window.close();
}, 5 * 60 * 1000);
