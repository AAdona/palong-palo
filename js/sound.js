/* Soft tap sounds and light haptics, made with the Web Audio API. No audio files.
   Browsers only allow audio after a tap, so the context is created on the first click. */
const Sound = (() => {
  const KEY = 'monday-doubles.sound';
  let ctx = null;
  let on = true;
  try {
    on = localStorage.getItem(KEY) !== 'off';
  } catch (e) {
    /* storage unavailable, keep sound on */
  }

  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      return null;
    }
    return ctx;
  }

  function blip(freq, { to = freq, dur = 0.06, gain = 0.05, type = 'sine', at = 0 } = {}) {
    if (!on) return;
    const c = unlock();
    if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function buzz(pattern) {
    if (on && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        /* not supported */
      }
    }
  }

  const LATE = 0.07; /* result cues start just after the tap tick */
  return {
    get enabled() {
      return on;
    },
    set(value) {
      on = !!value;
      try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
      } catch (e) {
        /* ignore */
      }
      if (on) this.tap();
    },
    unlock,
    /* every button press */
    tap() {
      blip(660, { to: 520, dur: 0.05 });
      buzz(6);
    },
    /* quiet confirmation, for edits like swaps */
    soft() {
      blip(520, { to: 440, dur: 0.07, gain: 0.035, at: LATE });
    },
    /* success: winner saved, round added, court opened */
    ok() {
      blip(523, { dur: 0.09, at: LATE });
      blip(659, { dur: 0.09, at: LATE + 0.07 });
      blip(784, { dur: 0.15, at: LATE + 0.14 });
      buzz([8, 40, 8]);
    },
    /* removals and warnings */
    warn() {
      blip(260, { to: 170, dur: 0.15, type: 'triangle', gain: 0.07, at: LATE });
      buzz(14);
    },
    undo() {
      blip(600, { to: 420, dur: 0.09, at: LATE });
    },
  };
})();
