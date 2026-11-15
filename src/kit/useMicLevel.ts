// Live microphone loudness 0..1. Good for "scream to unlock", "clap to submit", etc.
import { useEffect, useState } from "react";

export function useMicLevel(enabled: boolean) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;
    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const s of buf) sum += s * s;
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        raf = requestAnimationFrame(loop);
      };
      loop();
    })().catch(console.error);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [enabled]);
  return level;
}
