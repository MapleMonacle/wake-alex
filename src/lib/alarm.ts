// A loud, classic digital alarm clock: BEEP-BEEP-BEEP-BEEP ... pause ... repeat.
// `level` (0..1) makes it faster and higher as more people are disappointed.
// Must be started from a tap so the browser allows audio.
export function startAlarm() {
  const ctx = new AudioContext();
  // Compressor lets us drive it hot without ugly clipping.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 12;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp).connect(ctx.destination);

  let level = 0;
  let on = false;
  let ducked = false;
  let timer: number | undefined;

  const loudness = () => (!on ? 0 : ducked ? 0.12 : 0.9);

  function beep(at: number, freq: number, len: number) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(1, at + 0.005);
    g.gain.setValueAtTime(1, at + len - 0.01);
    g.gain.linearRampToValueAtTime(0, at + len);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + len + 0.02);
  }

  // One burst of four beeps, scheduled slightly ahead for tight timing.
  function burst() {
    if (!on) return;
    const t = ctx.currentTime + 0.05;
    const freq = 2000 + level * 900;
    const len = 0.085 - level * 0.025;
    const gap = 0.06 - level * 0.02;
    for (let i = 0; i < 4; i++) beep(t + i * (len + gap), freq, len);
    const burstMs = 4 * (len + gap) * 1000;
    const pauseMs = 520 - level * 360; // more people, less pause
    timer = window.setTimeout(burst, burstMs + pauseMs);
  }

  const apply = () => master.gain.setTargetAtTime(loudness(), ctx.currentTime, 0.04);

  // A sharp referee whistle: a high trill, right before the voice yells.
  function whistle() {
    const t = ctx.currentTime + 0.02;
    const o = ctx.createOscillator();
    const trill = ctx.createOscillator();
    const trillDepth = ctx.createGain();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 3100;
    trill.frequency.value = 28;
    trillDepth.gain.value = 180;
    trill.connect(trillDepth).connect(o.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.02);
    g.gain.setValueAtTime(0.9, t + 0.55);
    g.gain.linearRampToValueAtTime(0, t + 0.62);
    o.connect(g).connect(comp);
    o.start(t);
    trill.start(t);
    o.stop(t + 0.65);
    trill.stop(t + 0.65);
    return new Promise<void>((r) => setTimeout(r, 700));
  }

  return {
    whistle,
    start() {
      if (on) return;
      on = true;
      void ctx.resume();
      apply();
      burst();
    },
    setLevel(l: number) {
      level = Math.max(0, Math.min(1, l));
    },
    // Drop under the voice so the words come through.
    duck(d: boolean) {
      ducked = d;
      apply();
    },
    stop() {
      on = false;
      clearTimeout(timer);
      void ctx.close();
    },
  };
}
