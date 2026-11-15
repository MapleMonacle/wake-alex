// Alex's phone. Open /bedroom?key=... once; the key is remembered.
import { useEffect, useRef, useState } from "react";
import { startAlarm } from "./lib/alarm";
import { api, clock, duration, ownerKey, people, useBed, useNow } from "./lib/bed";
import { ringing, SELF } from "./lib/types";
import { bark, bestVoice, lineFor } from "./lib/voice";
import { Phone } from "./Phone";

type Alarm = ReturnType<typeof startAlarm>;
type Banner = { id: number; text: string };

// "07:30" -> the next time it's 7:30 (today if still ahead, else tomorrow).
function nextAt(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
const hhmm = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const bigClock = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[ap]\.m\./i, "");
const today = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

export default function Bedroom({ label }: { label?: string }) {
  const { state, accept } = useBed(800);
  const now = useNow(500);
  const [time, setTime] = useState(() => hhmm(Date.now() + 60_000));
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [snoozeNo, setSnoozeNo] = useState(0);
  const alarmRef = useRef<Alarm | null>(null);
  const nRef = useRef(SELF);
  const seenJoins = useRef(0);

  const isRinging = !!state && ringing(state, now);
  const n = SELF + (state?.joins.length ?? 0);
  nRef.current = n;

  // Start ringing when the alarm time arrives; faster and higher with the crowd.
  useEffect(() => {
    if (isRinging) alarmRef.current?.start();
  }, [isRinging]);
  useEffect(() => {
    alarmRef.current?.setLevel(Math.min(1, (n - 1) / 20));
  }, [n]);

  // A notification banner for every newly disappointed person.
  useEffect(() => {
    const joins = state?.joins.length ?? 0;
    // Awake, or a new night started (joins reset to 0): just resync, no banner.
    if (!state?.asleep || joins < seenJoins.current) {
      seenJoins.current = joins;
      return;
    }
    if (joins > seenJoins.current) {
      const fresh = joins - seenJoins.current;
      seenJoins.current = joins;
      const id = Date.now();
      const text = fresh === 1 ? "Someone new is disappointed in you." : `${fresh} more people are disappointed in you.`;
      setBanners((b) => [{ id, text }, ...b].slice(0, 3));
      setTimeout(() => setBanners((b) => b.filter((x) => x.id !== id)), 4500);
    }
  }, [state?.joins.length, state?.asleep]);

  // The voice: whistle, bark the latest number, let the alarm scream, repeat.
  useEffect(() => {
    if (!isRinging) return;
    let stop = false;
    (async () => {
      for (let i = 0; !stop; i++) {
        await new Promise((r) => setTimeout(r, 2200)); // let it beep first
        if (stop) break;
        const line = lineFor(nRef.current, i);
        alarmRef.current?.duck(true);
        await alarmRef.current?.whistle();
        setCaption(line);
        await bark(line);
        alarmRef.current?.duck(false);
      }
    })();
    return () => {
      stop = true;
      speechSynthesis.cancel();
      setCaption("");
    };
  }, [isRinging]);

  // Keep the screen on while asleep (supported browsers only).
  useEffect(() => {
    if (!state?.asleep || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release();
  }, [state?.asleep]);

  async function goToSleep(alarmAt: number) {
    setError(null);
    alarmRef.current?.stop();
    alarmRef.current = startAlarm(); // created inside the tap so audio is allowed later
    bestVoice();
    try {
      accept(await api.sleep(alarmAt));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function getUp() {
    setError(null);
    try {
      accept(await api.awake());
      alarmRef.current?.stop();
      alarmRef.current = null;
      speechSynthesis.cancel();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const dark = !!state?.asleep;

  if (!ownerKey())
    return (
      <Phone dark label={label}>
        <main className="screen alarm night">
          <section className="stage">
            <p className="status">This is Alex's phone. You shouldn't be here.</p>
          </section>
        </main>
      </Phone>
    );

  return (
    <Phone dark={dark} label={label}>
      <main className={`screen alarm ${dark ? "night" : "day"} ${isRinging ? "ringing" : ""}`}>
        <div className="banners">
          {banners.map((b) => (
            <div key={b.id} className="banner">
              <span className="banner-icon">C</span>
              <span className="banner-body">
                <b>Clinomania</b>
                <span>{b.text}</span>
              </span>
              <span className="banner-time">now</span>
            </div>
          ))}
        </div>

        {state && !state.asleep && (
          <section className="stage clock-app">
            <p className="app-title">Clinomania</p>
            <label className="setter">
              <span>Alarm</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <button className="sleep-btn" onClick={() => goToSleep(nextAt(time))}>
              Go to sleep
            </button>
            <div className="quick">
              <button onClick={() => goToSleep(Date.now() + 10_000)}>Ring in 10s</button>
              <button onClick={() => goToSleep(Date.now() + 60_000)}>Ring in 1 min</button>
            </div>
            {state.woke && state.woke.count > 0 && (
              <p className="hint">
                Last time you disappointed {people(state.woke.count)} and overslept by {duration(state.woke.at - state.woke.alarmAt)}.
              </p>
            )}
          </section>
        )}

        {state?.asleep && (
          <section className="lock">
            <p className="lock-date">{today(now)}</p>
            <p className="lock-time">{bigClock(now)}</p>
            {!isRinging ? (
              <p className="lock-pill">⏰ Alarm {clock(state.alarmAt!)} · in {duration(state.alarmAt! - now)}</p>
            ) : (
              <div className="ring-card">
                <p className="ring-kicker">Alarm · overslept {duration(now - state.alarmAt!)}</p>
                <p className="ring-n">{n}</p>
                <p className="ring-label">{n === 1 ? "person disappointed: you" : "people disappointed in you, including you"}</p>
                {caption && <p className="caption">“{caption}”</p>}
                <div className="ring-actions">
                  <button
                    className={`snooze ${snoozeNo ? "nope" : ""}`}
                    key={snoozeNo}
                    onClick={() => setSnoozeNo((s) => s + 1)}
                  >
                    {snoozeNo ? `Snooze denied. ${people(n)} said no.` : "Snooze"}
                  </button>
                  <button className="awake-btn" onClick={getUp}>
                    I'm awake
                  </button>
                </div>
              </div>
            )}
            {!isRinging && (
              <button className="ghost-btn" onClick={getUp}>
                I'm already up
              </button>
            )}
          </section>
        )}
        {error && <p className="error">{error}</p>}
      </main>
    </Phone>
  );
}
