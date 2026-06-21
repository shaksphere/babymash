// Procedural sound engine — no audio files needed.
// Generates cheerful tones, chords and the occasional "boop" using the WebAudio API.

let ctx: AudioContext | null = null;
let muted = false;

// A pentatonic scale sounds pleasant no matter which notes a baby smashes together.
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  // Browsers start the context suspended until a user gesture.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

// Pick a note seeded by a key/position so the same key tends to sing the same note.
function noteFor(seed: number) {
  const idx = Math.abs(Math.floor(seed)) % PENTATONIC.length;
  return PENTATONIC[idx];
}

const WAVES: OscillatorType[] = ['sine', 'triangle', 'square'];

export function playNote(seed = Math.random() * 100) {
  if (muted) return;
  const ac = initAudio();
  if (!ac) return;

  const now = ac.currentTime;
  const freq = noteFor(seed);
  const wave = WAVES[Math.abs(Math.floor(seed)) % WAVES.length];

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, now);
  // tiny pitch bloop up for character
  osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

// A celebratory little arpeggio for milestones.
export function playFanfare() {
  if (muted) return;
  const ac = initAudio();
  if (!ac) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    const now = ac.currentTime + i * 0.09;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  });
}
