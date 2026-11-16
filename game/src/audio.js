// Sound, synthesised live with WebAudio — oscillators and filtered noise,
// no audio files. Everything is guarded: in a headless browser, or before
// the first gesture, the context may not exist, and the game must play on
// silently. A crystal chimes a rising note for each crystal woken in its
// level; a mirror ticks when it turns; winning swells, losing falls.
const CHIME_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0];

export function createAudio() {
  let context = null;
  let master = null;
  let tide = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.4;
      master.connect(context.destination);
      startTide();
    } catch {
      context = null;
    }
    return context;
  }

  /** The sea itself: a loop of brown noise through a low filter, very quiet. */
  function startTide() {
    try {
      const length = context.sampleRate * 2;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3;
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = context.createGain();
      gain.gain.value = 0.05;
      noise.connect(filter).connect(gain).connect(master);
      noise.start();
      tide = gain;
    } catch {
      // Silence is acceptable; the game never depends on sound.
    }
  }

  function tone(freq, seconds, type, volume, when = 0) {
    if (!context || !master) return;
    try {
      const start = context.currentTime + when;
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // A missed note is never worth crashing the frame.
    }
  }

  return {
    /** Call on the first gesture so the context may start. */
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    click() {
      ensure();
      tone(660, 0.07, 'square', 0.12);
    },
    chime(count) {
      ensure();
      const note = CHIME_NOTES[count % CHIME_NOTES.length];
      tone(note, 0.7, 'sine', 0.25);
      tone(note * 2, 0.4, 'sine', 0.08);
    },
    levelClear() {
      ensure();
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => tone(note, 0.5, 'sine', 0.2, i * 0.09));
    },
    win() {
      ensure();
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((note, i) => tone(note, 0.9, 'sine', 0.22, i * 0.11));
    },
    lose() {
      ensure();
      tone(220, 0.9, 'triangle', 0.2);
      tone(164.81, 1.2, 'triangle', 0.2, 0.25);
    },
  };
}
