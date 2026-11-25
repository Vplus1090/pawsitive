// 8-Bit Web Audio Chiptune Synthesizer + Mobile Haptics + Bottom-Sheet Swipe Helper

const SFX_KEY = 'pawsitive_sfx_muted';
const HAPTIC_KEY = 'pawsitive_haptic_muted';

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSfxMuted() {
  try {
    return localStorage.getItem(SFX_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSfxMuted(muted) {
  try {
    localStorage.setItem(SFX_KEY, muted ? '1' : '0');
  } catch {
    // ignore storage limits
  }
}

export function isHapticMuted() {
  try {
    return localStorage.getItem(HAPTIC_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHapticMuted(muted) {
  try {
    localStorage.setItem(HAPTIC_KEY, muted ? '1' : '0');
  } catch {
    // ignore storage limits
  }
}

function vibrate(pattern) {
  if (isHapticMuted()) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore unsupported environments
    }
  }
}

function playToneSequence(notes, type = 'square', volume = 0.055) {
  if (isSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  for (const note of notes) {
    const start = now + (note.delay || 0);
    const duration = note.dur || 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = note.type || type;
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(note.endFreq, start + duration);
    }

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(note.vol ?? volume, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration + 0.01);
  }
}

export const fx = {
  tap() {
    vibrate(10);
    playToneSequence([{ freq: 720, endFreq: 960, dur: 0.032 }], 'square', 0.045);
  },

  tab() {
    vibrate(12);
    playToneSequence([
      { freq: 523.25, dur: 0.035, delay: 0 },
      { freq: 783.99, dur: 0.045, delay: 0.032 }
    ], 'square', 0.05);
  },

  open() {
    vibrate(14);
    playToneSequence([
      { freq: 523.25, dur: 0.04, delay: 0 },
      { freq: 659.25, dur: 0.04, delay: 0.035 },
      { freq: 783.99, dur: 0.05, delay: 0.07 }
    ], 'square', 0.05);
  },

  back() {
    vibrate(10);
    playToneSequence([
      { freq: 587.33, dur: 0.038, delay: 0 },
      { freq: 392.0, dur: 0.05, delay: 0.035 }
    ], 'triangle', 0.06);
  },

  scanTick() {
    vibrate([8, 20, 8]);
    playToneSequence([
      { freq: 880, endFreq: 1174.66, dur: 0.055, delay: 0 }
    ], 'triangle', 0.05);
  },

  success() {
    vibrate([18, 35, 30]);
    playToneSequence([
      { freq: 523.25, dur: 0.06, delay: 0 },
      { freq: 659.25, dur: 0.06, delay: 0.055 },
      { freq: 783.99, dur: 0.06, delay: 0.11 },
      { freq: 1046.5, dur: 0.14, delay: 0.165 }
    ], 'square', 0.06);
  },

  error() {
    vibrate([45, 30, 45]);
    playToneSequence([
      { freq: 210, endFreq: 140, dur: 0.09, delay: 0 },
      { freq: 160, endFreq: 110, dur: 0.11, delay: 0.085 }
    ], 'sawtooth', 0.05);
  }
};

export function createSwipeDownHandlers(onDismiss) {
  let startY = null;
  let startX = null;
  return {
    onTouchStart(e) {
      const touch = e.touches?.[0];
      if (!touch) return;
      startY = touch.clientY;
      startX = touch.clientX;
    },
    onTouchEnd(e) {
      if (startY === null) return;
      const touch = e.changedTouches?.[0];
      if (!touch) return;
      const dy = touch.clientY - startY;
      const dx = Math.abs(touch.clientX - startX);
      startY = null;
      startX = null;
      if (dy > 55 && dx < 60 && onDismiss) {
        onDismiss();
      }
    }
  };
}
