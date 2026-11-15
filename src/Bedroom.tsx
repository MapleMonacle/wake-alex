// Alex's phone. Open /bedroom?key=... once; the key is remembered.
import { useEffect, useRef, useState } from "react";
import { startAlarm } from "./lib/alarm";
import { api, clock, duration, ownerKey, people, useBed, useNow } from "./lib/bed";
import { ringing, SELF } from "./lib/types";
import { bestVoice, lineFor, prefetchLine, speakLine, stopSpeaking } from "./lib/voice";
import { LINE_COUNT } from "./lib/lines";
import { AppIcon, Phone } from "./Phone";
import { TimeWheel } from "./TimeWheel";

type Alarm = ReturnType<typeof startAlarm>;
type Banner = { id: number; text: string };

// "07:30" -> the next time it's 7:30 (today if still ahead, else tomorrow).
function nextAt(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
const hhmm = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const bigClock = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const today = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

let bannerId = 0;

export default function Bedroom({ staged }: { staged?: boolean }) {
  const { state, accept } = useBed(800);
  const now = useNow(500);
  const [time, setTime] = useState(() => hhmm(Date.now() + 120_000));
  const touched = useRef(false); // has Alex picked a time himself since he last woke?
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [snoozeNo, setSnoozeNo] = useState(0);
  const [armed, setArmed] = useState(false); // is there an AudioContext, created from a tap?
  const alarmRef = useRef<Alarm | null>(null);
  const nRef = useRef(SELF);
  const seenJoins = useRef<number | null>(null);

  const isRinging = !!state && ringing(state, now);

  // Back on the alarm screen after waking: suggest a minute from now, not the alarm he
  // just woke from (which would read "rings in 23h 59m").
  useEffect(() => {
    if (state && !state.asleep) {
      touched.current = false;
      setTime(hhmm(Date.now() + 120_000));
    }
  }, [state?.asleep]); // eslint-disable-line react-hooks/exhaustive-deps
  // If the suggested time slips into the past while the screen sits there, re-suggest
  // (a time that's more than 23h away just rolled over; nobody sets those on purpose).
  useEffect(() => {
    if (state && !state.asleep && !touched.current && nextAt(time) - Date.now() > 23 * 3_600_000) setTime(hhmm(Date.now() + 120_000));
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = SELF + (state?.joins.length ?? 0);
  nRef.current = n;

  // Start ringing when the alarm time arrives; faster and higher with the crowd.
  useEffect(() => {
    if (isRinging && armed) alarmRef.current?.start();
  }, [isRinging, armed]);
  useEffect(() => {
    alarmRef.current?.setLevel(Math.min(1, (n - 1) / 20));
  }, [n, armed]);

  // A notification banner for every newly disappointed person.
  useEffect(() => {
    if (!state) return;
    const joins = state.joins.length;
    // First load, awake, or a new night started (joins reset to 0): just resync, no banner.
    if (seenJoins.current === null || !state.asleep || joins < seenJoins.current) {
      seenJoins.current = joins;
      return;
    }
    if (joins > seenJoins.current) {
      const fresh = joins - seenJoins.current;
      seenJoins.current = joins;
      const id = ++bannerId;
      const total = SELF + joins;
      // Before the alarm, people are getting their disappointment in early.
      const early = state.alarmAt !== null && Date.now() < state.alarmAt;
      const text = early
        ? fresh === 1
          ? `Someone is disappointed in you in advance. ${joins} waiting.`
          : `${fresh} more people are disappointed in you in advance. ${joins} waiting.`
        : fresh === 1
          ? `Someone new is disappointed in you for sleeping in. That makes ${total}.`
          : `${fresh} more people are disappointed in you for sleeping in. That makes ${total}.`;
      setBanners((b) => [{ id, text }, ...b].slice(0, 2));
      setTimeout(() => setBanners((b) => b.filter((x) => x.id !== id)), 4500);
      try {
        navigator.vibrate?.([30, 40, 30]);
      } catch {
        /* not supported */
      }
    }
  }, [state?.joins.length, state?.asleep]); // eslint-disable-line react-hooks/exhaustive-deps

  // The voice: whistle, bark the latest number, let the alarm scream, repeat.
  useEffect(() => {
    if (!isRinging) return;
    let stop = false;
    (async () => {
      for (let i = 0; !stop; i++) {
        await new Promise((r) => setTimeout(r, 2200)); // let it beep first
        if (stop) break;
        const n = nRef.current;
        const k = i % LINE_COUNT;
        const line = lineFor(n, k);
        prefetchLine(n, k); // download the neural voice while the whistle blows
        alarmRef.current?.duck(true);
        await alarmRef.current?.whistle();
        if (stop) break;
        setCaption(line);
        prefetchLine(nRef.current, (k + 1) % LINE_COUNT); // have the next line ready before we need it
        await speakLine(n, k);
        if (stop) break;
        alarmRef.current?.duck(false);
        // Let the words linger a moment, then clear them so a caption never contradicts the live count.
        await new Promise((r) => setTimeout(r, 1200));
        if (!stop) setCaption("");
      }
    })();
    return () => {
      stop = true;
      stopSpeaking();
      setCaption("");
    };
  }, [isRinging]);

  // A fresh night starts with a fresh snooze button.
  useEffect(() => {
    if (!isRinging) setSnoozeNo(0);
  }, [isRinging]);

  // Keep the screen on while asleep (supported browsers only). The lock is dropped
  // whenever the tab is hidden, so take it again when it comes back.
  useEffect(() => {
    if (!state?.asleep || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const take = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (gone) void l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", take);
      void lock?.release();
    };
  }, [state?.asleep]);

  // Silence everything if the page goes away mid-ring (matters on the stage and with HMR).
  useEffect(
    () => () => {
      alarmRef.current?.stop();
      alarmRef.current = null;
    },
    [],
  );

  // Audio must be created inside a tap, or the browser keeps it silent.
  function arm() {
    alarmRef.current?.stop();
    alarmRef.current = startAlarm();
    bestVoice();
    setArmed(true);
  }

  async function goToSleep(alarmAt: number) {
    setError(null);
    arm();
    try {
      accept(await api.sleep(alarmAt));
    } catch (e) {
      alarmRef.current?.stop();
      alarmRef.current = null;
      setArmed(false);
      setError((e as Error).message);
    }
  }

  async function getUp() {
    setError(null);
    try {
      accept(await api.awake());
      alarmRef.current?.stop();
      alarmRef.current = null;
      setArmed(false);
      stopSpeaking();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function snooze() {
    setSnoozeNo((s) => s + 1);
    try {
      navigator.vibrate?.([60, 50, 60]);
    } catch {
      /* not supported */
    }
  }

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(id);
  }, [error]);

  if (!ownerKey())
    return (
      <Phone dark staged={staged}>
        <main className="screen alarm night">
          <div className="bg bg-night" aria-hidden />
          <div className="scroll">
            <section className="view center">
              <AppIcon size={56} />
              <h1 className="headline">This is Alex's phone.</h1>
              <p className="lede">You shouldn't be here. The Disappointment Index is over there.</p>
              <a className="text-link" href="/">
                Go to the Disappointment Index
              </a>
            </section>
          </div>
        </main>
      </Phone>
    );

  const asleep = !!state?.asleep;
  const dark = !state || asleep;
  const ringsAt = nextAt(time);

  return (
    <Phone dark={dark} staged={staged}>
      <main className={`screen alarm ${dark ? "night" : "day"} ${isRinging ? "ringing" : ""}`}>
        <div className="bg bg-night" aria-hidden />
        <div className="bg bg-day" aria-hidden />
        <div className="bg bg-alarm" aria-hidden />

        <div className="banners" aria-live="polite">
          {banners.map((b) => (
            <div key={b.id} className="banner">
              <AppIcon size={38} />
              <span className="banner-body">
                <span className="banner-head">
                  <b>Clinomania</b>
                  <span className="banner-time">now</span>
                </span>
                <span>{b.text}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="scroll">
          {state && !asleep && (
            <section className="setter" key="setter">
              <header className="nav">
                <AppIcon />
                <span className="wordmark">Clinomania</span>
              </header>

              <div className="setter-main">
                <p className="eyebrow">Set alarm</p>
                <TimeWheel value={time} onChange={(v) => ((touched.current = true), setTime(v))} />
                <p className="setter-in">Rings in {duration(ringsAt - now)}</p>
              </div>

              <div className="setter-actions">
                <button className="sleep-btn" onClick={() => goToSleep(nextAt(time))}>
                  Go to sleep
                </button>
                <div className="quick">
                  <span>Ring in</span>
                  <button onClick={() => goToSleep(Date.now() + 10_000)}>10s</button>
                  <button onClick={() => goToSleep(Date.now() + 30_000)}>30s</button>
                  <button onClick={() => goToSleep(Date.now() + 60_000)}>1 min</button>
                </div>
                <p className="setter-note">
                  {state.woke && state.woke.count > 0
                    ? `Last time you disappointed ${people(state.woke.count)} and overslept by ${duration(state.woke.at - state.woke.alarmAt)}.`
                    : "If you sleep in, anyone with the link can be disappointed in you."}
                </p>
              </div>
            </section>
          )}

          {state && asleep && (
            <section className={`lock ${isRinging ? "is-ringing" : ""}`} key="lock">
              <div className="lock-top">
                <p className="lock-date">{today(now)}</p>
                <p className="lock-time">{bigClock(now)}</p>
              </div>

              {!isRinging ? (
                <div className="lock-wait" key="wait">
                  <p className="alarm-chip">
                    <AlarmGlyph />
                    <span>{clock(state.alarmAt!)}</span>
                    <span className="chip-in">in {duration(state.alarmAt! - now)}</span>
                  </p>
                  {state.joins.length > 0 && (
                    <p className="alarm-chip waiting-chip">
                      <span>{people(state.joins.length)} already disappointed</span>
                    </p>
                  )}
                  {!armed && (
                    <button className="arm-btn" onClick={arm}>
                      Sound is off. Tap to turn the alarm on.
                    </button>
                  )}
                  <div className="lock-bottom">
                    <span className="lock-round" aria-hidden>
                      <svg width="22" height="22" viewBox="0 0 22 22">
                        <path d="M7 2.5h8v3l-1.8 3v10a1 1 0 0 1-1 1H9.8a1 1 0 0 1-1-1v-10L7 5.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <path d="M11 11.2v2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </span>
                    <button className="glass-btn" onClick={getUp}>
                      I'm already up
                    </button>
                    <span className="lock-round" aria-hidden>
                      <svg width="22" height="22" viewBox="0 0 22 22">
                        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 19 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 16.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <circle cx="11" cy="11.800" r="3.300" fill="none" stroke="currentColor" strokeWidth="1.700" />
                      </svg>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="lock-ring" key="ring">
                  <div className="ring-card">
                    <p className="ring-head">
                      <span className="ring-app">
                        <AlarmGlyph />
                        Alarm
                      </span>
                      <span>overslept {duration(now - state.alarmAt!)}</span>
                    </p>
                    <p className="ring-n">
                      <span key={n} className="pop">
                        {n.toLocaleString()}
                      </span>
                    </p>
                    <p className="ring-label">{n === 1 ? "person is disappointed in you for sleeping in" : "people are disappointed in you for sleeping in"}</p>
                    <p className="ring-sub">{n === 1 ? "It's you." : "One of them is you."}</p>
                  </div>

                  <div className="caption-well" aria-live="off">
                    {caption && (
                      <p className="caption" key={caption}>
                        {caption}
                      </p>
                    )}
                  </div>

                  <div className="ring-actions">
                    {!armed && (
                      <button className="arm-btn" onClick={arm}>
                        Sound is off. Tap to turn the alarm on.
                      </button>
                    )}
                    <button className={`snooze ${snoozeNo ? "nope" : ""}`} key={snoozeNo} onClick={snooze}>
                      {snoozeNo ? (
                        <>
                          <b>Snooze denied.</b> {people(n)} said no.
                        </>
                      ) : (
                        "Snooze"
                      )}
                    </button>
                    <button className="awake-btn" onClick={getUp}>
                      I'm awake
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
        {error && (
          <p className="toast" role="alert">
            {error}
          </p>
        )}
      </main>
    </Phone>
  );
}

function AlarmGlyph() {
  return (
    <svg className="alarm-glyph" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13.500" r="7.200" />
        <path d="M12 9.800v3.700l2.400 1.600M5.200 4.200 2.800 6.400M18.800 4.200l2.400 2.200" />
      </g>
    </svg>
  );
}
