// Alex's own device. Open /bedroom?key=... once; the key is remembered.
import { useEffect, useRef, useState } from "react";
import { startSiren } from "./lib/alarm";
import { api, duration, ownerKey, people, useBed } from "./lib/bed";
import { say } from "./kit/sfx";

type Siren = ReturnType<typeof startSiren>;

const line = (n: number) =>
  n === 1
    ? "Wake up. One person is disappointed in you for sleeping in."
    : n < 10
      ? `Wake up! ${n} people are disappointed in you for sleeping in.`
      : `WAKE UP! ${n} PEOPLE ARE DISAPPOINTED IN YOU FOR SLEEPING IN. YOU ARE DISAPPOINTING THEM ALL.`;

export default function Bedroom() {
  const { state, accept } = useBed(800);
  const [error, setError] = useState<string | null>(null);
  const sirenRef = useRef<Siren | null>(null);
  const countRef = useRef(0);
  countRef.current = state?.count ?? 0;
  const asleep = !!state?.asleep;
  const hasKey = !!ownerKey();

  // Alarm loudness follows the crowd: 1 person = a nudge, ~25 people = chaos.
  useEffect(() => {
    sirenRef.current?.setLevel(asleep ? Math.min(1, countRef.current / 25) : 0);
  }, [asleep, state?.count]);

  // The voice: keep nagging with the latest number until he's up.
  useEffect(() => {
    if (!asleep) return;
    let stop = false;
    (async () => {
      while (!stop) {
        const n = countRef.current;
        if (n > 0) {
          sirenRef.current?.duck(true);
          await say(line(n), { rate: n < 10 ? 1 : 1.15, pitch: n < 10 ? 1 : 0.8 });
          sirenRef.current?.duck(false);
        }
        await new Promise((r) => setTimeout(r, n > 0 ? 1200 : 1000));
      }
    })();
    return () => {
      stop = true;
      speechSynthesis.cancel();
    };
  }, [asleep]);

  // Keep the screen on while sleeping (supported browsers only).
  useEffect(() => {
    if (!asleep || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release();
  }, [asleep]);

  async function goToSleep() {
    setError(null);
    sirenRef.current?.stop();
    sirenRef.current = startSiren(); // created inside the tap so audio is allowed
    try {
      accept(await api.sleep());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function wakeUp() {
    setError(null);
    try {
      accept(await api.awake());
      sirenRef.current?.stop();
      sirenRef.current = null;
      speechSynthesis.cancel();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!hasKey) return <main className="bedroom"><p className="status">This is Alex's bedroom. You shouldn't be here.</p></main>;
  if (!state) return <main className="bedroom" />;

  return (
    <main className={`bedroom ${asleep ? "night" : "day"} ${asleep && state.count > 0 ? "ringing" : ""}`}>
      {asleep ? (
        <section className="stage">
          <p className="status">Asleep for {duration(Date.now() - (state.since ?? Date.now()))}</p>
          <p className="count">
            <span className="n">{state.count}</span>
            <span className="label">{state.count === 1 ? "person is" : "people are"} disappointed in you</span>
          </p>
          <button className="awake-btn" onClick={wakeUp}>
            I'm awake
          </button>
        </section>
      ) : (
        <section className="stage">
          <p className="status">
            {state.woke ? `Last time: woken by ${people(state.woke.count)} after ${duration(state.woke.slept)}.` : "Ready when you are."}
          </p>
          <button className="sleep-btn" onClick={goToSleep}>
            Go to sleep
          </button>
          <p className="hint">Turn your volume up. Anyone with the link can wake you.</p>
        </section>
      )}
      {error && <p className="error">{error}</p>}
    </main>
  );
}
