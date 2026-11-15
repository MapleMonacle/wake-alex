// Zero-asset sound effects (Web Audio synth) + confetti. Call from a click handler
// the first time so the browser allows audio.
import confetti from "canvas-confetti";

let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.2, slideTo?: number) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export const sfx = {
  beep: () => tone(880, 0.12),
  boing: () => tone(180, 0.5, "sine", 0.4, 900),
  wrong: () => {
    tone(220, 0.25, "sawtooth", 0.2);
    setTimeout(() => tone(160, 0.4, "sawtooth", 0.2), 220);
  },
  sadTrombone: () =>
    [392, 370, 349, 330].forEach((f, i) => setTimeout(() => tone(f, i === 3 ? 0.9 : 0.35, "sawtooth", 0.15, i === 3 ? 300 : undefined), i * 380)),
  airhorn: () => [0, 180, 360].forEach((t) => setTimeout(() => tone(466, 0.16, "sawtooth", 0.3), t)),
  fart: () => {
    const a = ac();
    const len = a.sampleRate * 0.7;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(400, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(60, a.currentTime + 0.7);
    f.Q.value = 12;
    src.connect(f).connect(a.destination);
    src.start();
  },
};

export const celebrate = () => confetti({ particleCount: 160, spread: 90, origin: { y: 0.7 } });
export const emojiRain = (emoji = "🤡") =>
  confetti({ particleCount: 60, spread: 120, scalar: 2.2, shapes: [confetti.shapeFromText({ text: emoji, scalar: 2.2 })] });

// Speaks text; resolves when finished, so you can sequence: await say("..."); celebrate();
// `voice` matches by substring of the voice name. See what this machine has with listVoices().
export function say(text: string, opts: { rate?: number; pitch?: number; voice?: string } = {}) {
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;
    if (opts.voice) u.voice = speechSynthesis.getVoices().find((v) => v.name.includes(opts.voice!)) ?? null;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

// Voices load asynchronously in Chrome; this waits for them.
export function listVoices(): Promise<SpeechSynthesisVoice[]> {
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    speechSynthesis.addEventListener("voiceschanged", () => resolve(speechSynthesis.getVoices()), { once: true });
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
  });
}
