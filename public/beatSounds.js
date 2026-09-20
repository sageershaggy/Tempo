// Focus Beat sound library — Web Audio generators with subtle per-hit variation.
// Loaded by the offscreen document (and mirrored in services/beatSounds.ts for
// the Vite/dev fallback). Keep IDs in sync with TimerScreen.beatSoundOptions.

(function (root) {
  'use strict';

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const noiseBufferCache = new WeakMap();

  function getNoiseBuffer(ctx, seconds) {
    let map = noiseBufferCache.get(ctx);
    if (!map) {
      map = new Map();
      noiseBufferCache.set(ctx, map);
    }
    const key = String(seconds);
    if (map.has(key)) return map.get(key);

    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    map.set(key, buffer);
    return buffer;
  }

  function playNoiseBurst(ctx, {
    start = ctx.currentTime,
    duration = 0.05,
    volume = 0.2,
    filterType = 'bandpass',
    filterFreq = 2000,
    filterQ = 1,
    attack = 0.002,
  } = {}) {
    const source = ctx.createBufferSource();
    source.buffer = getNoiseBuffer(ctx, Math.max(duration, 0.08));

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function playTone(ctx, {
    freq,
    type = 'sine',
    start = ctx.currentTime,
    duration = 0.2,
    volume = 0.25,
    attack = 0.005,
    detune = 0,
  }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    return osc;
  }

  const beatSounds = {
    // Soft sine with gentle harmonic — unobtrusive pulse
    soft(ctx) {
      const now = ctx.currentTime;
      const base = 210 + rand(-12, 18);
      const vol = 0.28 * rand(0.88, 1.1);
      playTone(ctx, { freq: base, start: now, duration: rand(0.16, 0.22), volume: vol, attack: 0.008 });
      playTone(ctx, { freq: base * 2, start: now, duration: rand(0.1, 0.14), volume: vol * 0.18, attack: 0.01 });
    },

    // Crisp metronome tick with noise transient
    tick(ctx) {
      const now = ctx.currentTime;
      const freq = rand(920, 1180);
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.025,
        volume: rand(0.14, 0.2),
        filterType: 'highpass',
        filterFreq: 2500,
        filterQ: 0.7,
        attack: 0.001,
      });
      playTone(ctx, {
        freq,
        type: 'triangle',
        start: now,
        duration: rand(0.028, 0.04),
        volume: rand(0.16, 0.22),
        attack: 0.001,
      });
    },

    // Woodblock / clave
    wood(ctx) {
      const now = ctx.currentTime;
      const base = pick([520, 580, 640, 700]) * rand(0.97, 1.03);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.55, now + 0.06);
      filter.type = 'bandpass';
      filter.frequency.value = base * 1.2;
      filter.Q.value = rand(4, 7);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(rand(0.4, 0.55), now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + rand(0.07, 0.1));
      osc.start(now);
      osc.stop(now + 0.12);
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.02,
        volume: 0.12,
        filterType: 'bandpass',
        filterFreq: base * 2,
        filterQ: 3,
      });
    },

    // Soft bell with harmonics + pitch variation
    chime(ctx) {
      const now = ctx.currentTime;
      const fund = pick([1046, 1174, 1318, 1396]) * rand(0.99, 1.01);
      const vol = rand(0.2, 0.28);
      [[1, 1], [2, 0.45], [3, 0.22], [4.2, 0.1]].forEach(([mul, amp], i) => {
        playTone(ctx, {
          freq: fund * mul,
          start: now,
          duration: 0.75 - i * 0.12,
          volume: vol * amp,
          attack: 0.004,
          detune: rand(-4, 4),
        });
      });
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.018,
        volume: 0.1,
        filterType: 'highpass',
        filterFreq: 4000,
      });
    },

    // Water droplet with FM + cavity resonance
    drop(ctx) {
      const now = ctx.currentTime;
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const carrierGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(filter);
      filter.connect(carrierGain);
      carrierGain.connect(ctx.destination);

      const startFreq = rand(1600, 2000);
      carrier.frequency.setValueAtTime(startFreq, now);
      carrier.frequency.exponentialRampToValueAtTime(rand(240, 300), now + 0.06);
      carrier.frequency.exponentialRampToValueAtTime(rand(150, 190), now + 0.16);
      carrier.type = 'sine';

      modulator.frequency.setValueAtTime(rand(32, 48), now);
      modulator.frequency.exponentialRampToValueAtTime(8, now + 0.1);
      modulator.type = 'sine';
      modGain.gain.setValueAtTime(rand(240, 340), now);
      modGain.gain.exponentialRampToValueAtTime(18, now + 0.1);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.09);
      filter.Q.value = rand(6, 10);

      const vol = rand(0.3, 0.38);
      carrierGain.gain.setValueAtTime(0.0001, now);
      carrierGain.gain.linearRampToValueAtTime(vol, now + 0.008);
      carrierGain.gain.exponentialRampToValueAtTime(vol * 0.4, now + 0.05);
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      carrier.start(now);
      carrier.stop(now + 0.28);
      modulator.start(now);
      modulator.stop(now + 0.28);

      playTone(ctx, {
        freq: rand(280, 340),
        start: now + 0.04,
        duration: 0.28,
        volume: 0.1,
        attack: 0.02,
      });
    },

    // Heartbeat (lub-dub) with organic noise shaping
    pulse(ctx) {
      const now = ctx.currentTime;
      const createHeartSound = (startTime, duration, baseFreq, volume) => {
        const bufferSize = Math.ceil(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const t = i / ctx.sampleRate;
          const envelope = Math.exp(-t * 25) * Math.sin(Math.PI * t / duration);
          const noise = Math.random() * 2 - 1;
          const toneWave = Math.sin(2 * Math.PI * baseFreq * t * (1 - t * 3));
          data[i] = (noise * 0.3 + toneWave * 0.7) * envelope;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = baseFreq * 3;
        const gain = ctx.createGain();
        gain.gain.value = volume * rand(0.9, 1.08);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(startTime);
      };

      createHeartSound(now, 0.12, rand(40, 48), 0.55);
      createHeartSound(now + rand(0.1, 0.14), 0.08, rand(58, 70), 0.4);
      playTone(ctx, {
        freq: rand(30, 38),
        start: now,
        duration: 0.22,
        volume: 0.32,
        attack: 0.015,
      });
    },

    // Soft electronic blip with pitch glide variation
    digital(ctx) {
      const now = ctx.currentTime;
      const high = pick([760, 880, 990, 1100]) * rand(0.98, 1.02);
      const low = high * rand(0.45, 0.55);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = pick(['square', 'sawtooth']);
      osc.frequency.setValueAtTime(high, now);
      osc.frequency.exponentialRampToValueAtTime(low, now + 0.06);
      filter.type = 'lowpass';
      filter.frequency.value = rand(1800, 2800);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(rand(0.12, 0.18), now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + rand(0.09, 0.13));
      osc.start(now);
      osc.stop(now + 0.14);
    },

    // Singing bowl with beating partials
    bowl(ctx) {
      const now = ctx.currentTime;
      const base = pick([220, 246, 256, 277]) * rand(0.995, 1.005);
      const vol = rand(0.2, 0.26);
      [1, 2, 3.01, 4.1].forEach((mul, i) => {
        playTone(ctx, {
          freq: base * mul,
          start: now,
          duration: 0.9 - i * 0.1,
          volume: vol * (i === 0 ? 1 : 0.35 / i),
          attack: 0.02,
          detune: i === 2 ? rand(3, 8) : rand(-3, 3),
        });
      });
    },

    // Crystal / glass tap
    glass(ctx) {
      const now = ctx.currentTime;
      const fund = pick([1568, 1760, 1975, 2093]) * rand(0.99, 1.01);
      playTone(ctx, { freq: fund, start: now, duration: 0.55, volume: rand(0.18, 0.24), attack: 0.002 });
      playTone(ctx, { freq: fund * 2.4, start: now, duration: 0.35, volume: 0.08, attack: 0.002 });
      playTone(ctx, { freq: fund * 5.1, start: now, duration: 0.18, volume: 0.04, attack: 0.001 });
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.012,
        volume: 0.08,
        filterType: 'highpass',
        filterFreq: 6000,
      });
    },

    // Soft knuckle knock
    knock(ctx) {
      const now = ctx.currentTime;
      const base = rand(90, 130);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * 2.2, now);
      osc.frequency.exponentialRampToValueAtTime(base, now + 0.05);
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 2;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(rand(0.45, 0.55), now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.14);
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.03,
        volume: 0.15,
        filterType: 'bandpass',
        filterFreq: 180,
        filterQ: 2,
      });
    },

    // Warm marimba / kalimba bar
    marimba(ctx) {
      const now = ctx.currentTime;
      const fund = pick([392, 440, 493, 523, 587]) * rand(0.99, 1.01);
      playTone(ctx, { freq: fund, type: 'sine', start: now, duration: 0.45, volume: rand(0.28, 0.34), attack: 0.003 });
      playTone(ctx, { freq: fund * 4.1, type: 'sine', start: now, duration: 0.12, volume: 0.12, attack: 0.002 });
      playTone(ctx, { freq: fund * 0.5, type: 'sine', start: now, duration: 0.2, volume: 0.08, attack: 0.01 });
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.015,
        volume: 0.06,
        filterType: 'bandpass',
        filterFreq: fund * 3,
        filterQ: 4,
      });
    },

    // Finger snap
    snap(ctx) {
      const now = ctx.currentTime;
      playNoiseBurst(ctx, {
        start: now,
        duration: rand(0.03, 0.045),
        volume: rand(0.28, 0.36),
        filterType: 'bandpass',
        filterFreq: rand(1800, 2600),
        filterQ: rand(1.5, 3),
        attack: 0.001,
      });
      playNoiseBurst(ctx, {
        start: now,
        duration: 0.02,
        volume: 0.12,
        filterType: 'highpass',
        filterFreq: 5000,
      });
    },

    // Soft shaker / sand hit
    shaker(ctx) {
      const now = ctx.currentTime;
      playNoiseBurst(ctx, {
        start: now,
        duration: rand(0.06, 0.1),
        volume: rand(0.18, 0.26),
        filterType: 'bandpass',
        filterFreq: rand(4500, 7000),
        filterQ: rand(0.6, 1.2),
        attack: 0.002,
      });
      playNoiseBurst(ctx, {
        start: now + 0.01,
        duration: 0.05,
        volume: 0.08,
        filterType: 'highpass',
        filterFreq: 8000,
      });
    },

    // Soft bird-like chirp
    chirp(ctx) {
      const now = ctx.currentTime;
      const startF = pick([1400, 1600, 1800, 2000]) * rand(0.97, 1.03);
      const endF = startF * rand(1.25, 1.55);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(rand(0.12, 0.18), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + rand(0.1, 0.14));
      osc.start(now);
      osc.stop(now + 0.16);
    },

    // Warm low focus tone
    tone(ctx) {
      const now = ctx.currentTime;
      const base = pick([164, 174, 196, 220]) * rand(0.99, 1.01);
      playTone(ctx, { freq: base, start: now, duration: rand(0.28, 0.38), volume: rand(0.22, 0.28), attack: 0.02 });
      playTone(ctx, { freq: base * 1.5, start: now, duration: 0.22, volume: 0.08, attack: 0.025, detune: rand(-6, 6) });
    },

    // Soft clap
    clap(ctx) {
      const now = ctx.currentTime;
      const gaps = [0, rand(0.008, 0.014), rand(0.02, 0.03)];
      gaps.forEach((offset, i) => {
        playNoiseBurst(ctx, {
          start: now + offset,
          duration: rand(0.035, 0.05),
          volume: (0.22 - i * 0.04) * rand(0.9, 1.1),
          filterType: 'bandpass',
          filterFreq: rand(900, 1400),
          filterQ: rand(0.8, 1.4),
          attack: 0.001,
        });
      });
    },
  };

  const catalog = [
    { id: 'soft', name: 'Soft', icon: 'waves' },
    { id: 'tick', name: 'Tick', icon: 'timer' },
    { id: 'wood', name: 'Wood', icon: 'forest' },
    { id: 'chime', name: 'Bell', icon: 'notifications' },
    { id: 'drop', name: 'Water', icon: 'water_drop' },
    { id: 'pulse', name: 'Heart', icon: 'favorite' },
    { id: 'digital', name: 'Digital', icon: 'memory' },
    { id: 'bowl', name: 'Bowl', icon: 'self_improvement' },
    { id: 'glass', name: 'Glass', icon: 'wine_bar' },
    { id: 'knock', name: 'Knock', icon: 'door_front' },
    { id: 'marimba', name: 'Marimba', icon: 'piano' },
    { id: 'snap', name: 'Snap', icon: 'touch_app' },
    { id: 'shaker', name: 'Shaker', icon: 'grain' },
    { id: 'chirp', name: 'Chirp', icon: 'emoji_nature' },
    { id: 'tone', name: 'Tone', icon: 'graphic_eq' },
    { id: 'clap', name: 'Clap', icon: 'back_hand' },
  ];

  function play(ctx, soundType) {
    const fn = beatSounds[soundType] || beatSounds.soft;
    fn(ctx);
  }

  root.TempoBeatSounds = { beatSounds, catalog, play };
})(typeof self !== 'undefined' ? self : globalThis);
