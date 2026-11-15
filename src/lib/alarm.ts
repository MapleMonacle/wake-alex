// A siren that gets louder and more frantic as `level` rises (0 = silent, 1 = chaos).
// Must be started from a click/tap so the browser allows audio.
export function startSiren() {
  const ctx = new AudioContext();
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 880;
  const lfo = ctx.createOscillator(); // wobbles the pitch: wee-woo
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 1.2;
  lfoDepth.gain.value = 260;
  lfo.connect(lfoDepth).connect(osc.frequency);

  const tone = ctx.createBiquadFilter(); // tame the square wave a little
  tone.type = "lowpass";
  tone.frequency.value = 2400;
  osc.connect(tone).connect(out);
  osc.start();
  lfo.start();

  let level = 0;
  let ducked = false;
  const gainFor = () => (level === 0 ? 0 : ducked ? 0.015 : 0.04 + level * 0.22);
  const apply = () => out.gain.setTargetAtTime(gainFor(), ctx.currentTime, 0.15);

  return {
    setLevel(l: number) {
      level = Math.max(0, Math.min(1, l));
      const t = ctx.currentTime;
      lfo.frequency.setTargetAtTime(1.2 + level * 5, t, 0.3);
      osc.frequency.setTargetAtTime(760 + level * 420, t, 0.3);
      apply();
    },
    // Drop the siren under the voice so the words are audible.
    duck(on: boolean) {
      ducked = on;
      apply();
    },
    stop() {
      void ctx.close();
    },
  };
}
