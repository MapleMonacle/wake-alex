// The Disappointment Index: what everyone else sees.
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { DisappointmentChart } from "./Chart";
import { api, clock, duration, people, useBed, useNow, type BedState } from "./lib/bed";
import { personMinutes, ringing, SELF } from "./lib/types";
import { deviceId } from "./kit/me";
import { AppIcon, Phone } from "./Phone";

const me = deviceId();
const TITLE = "Clinomania";

export default function Public({ staged }: { staged?: boolean }) {
  const now = useNow(1000);
  const [mine, setMine] = useState(false);
  const [justWoke, setJustWoke] = useState(false);
  const screenRef = useRef<HTMLElement>(null);

  // Confetti from this screen (not the middle of the window: on the stage there are two phones).
  function celebrate() {
    const r = screenRef.current?.getBoundingClientRect();
    const origin = r
      ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height * 0.62) / window.innerHeight }
      : { x: 0.5, y: 0.7 };
    void confetti({
      particleCount: 140,
      spread: 80,
      startVelocity: 42,
      origin,
      colors: ["#ffb224", "#f0412f", "#fff6df", "#2b2f78", "#ff8a4c"],
      disableForReducedMotion: true,
    });
  }

  const { state, accept } = useBed(1000, (prev, next) => {
    // He just got up: everyone watching gets the congratulations.
    if (prev?.asleep && !next.asleep && next.woke && next.woke.count > 0) {
      setJustWoke(true);
      celebrate();
      setTimeout(celebrate, 650);
      notify(next.woke.count);
    }
    if (!prev?.asleep && next.asleep) {
      setMine(false);
      setJustWoke(false);
      document.title = TITLE;
    }
  });

  // After a reload, remember that this device already pressed the button.
  const alarmAt = state?.asleep ? state.alarmAt : null;
  useEffect(() => {
    if (alarmAt === null) return;
    let alive = true;
    api.helped(me).then((r) => alive && r.helped && setMine(true)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [alarmAt]);

  async function disappoint() {
    if (!state?.asleep || mine) return; // before the alarm counts too: disappointment in advance
    setMine(true);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* not supported */
    }
    if (!staged) askForNotifications(); // no permission prompt on the projector
    const res = await api.disappoint(me).catch(() => null);
    if (!res) return setMine(false); // offline: let them try again
    accept(res);
    if (!res.you) setMine(false); // the server didn't count it (he got up, or clocks disagree)
  }

  const isRinging = !!state && ringing(state, now);
  const theme = !state || state.asleep ? "night" : "day";
  const status = !state ? "" : isRinging ? "Live" : state.asleep ? "Alarm set" : "Awake";

  return (
    <Phone dark={theme === "night"} staged={staged}>
      <main ref={screenRef} className={`screen public ${theme}`}>
        <div className="bg bg-night" aria-hidden />
        <div className="bg bg-day" aria-hidden />
        <div className="scroll">
          <header className="nav">
            <AppIcon />
            <span className="wordmark">Clinomania</span>
            {status && (
              <span className={`status-pill ${isRinging ? "is-live" : ""}`}>
                <i /> {status}
              </span>
            )}
          </header>

          {!state && <Loading />}
          {state?.asleep && !isRinging && <Waiting key="waiting" state={state} now={now} mine={mine} onDisappoint={disappoint} />}
          {state && isRinging && <Live key="live" state={state} now={now} mine={mine} onDisappoint={disappoint} />}
          {state && !state.asleep && <Morning key="morning" state={state} justWoke={justWoke} />}

          {state && (
            <footer className="foot">
              At a minimum, Alex is disappointing himself. The question is how many others he's disappointing by sleeping in.
            </footer>
          )}
        </div>
      </main>
    </Phone>
  );
}

function Loading() {
  return (
    <section className="view center" aria-busy="true">
      <p className="eyebrow">The Disappointment Index</p>
      <p className="loading-line">Checking on Alex</p>
    </section>
  );
}

function Waiting({ state, now, mine, onDisappoint }: { state: BedState; now: number; mine: boolean; onDisappoint: () => void }) {
  const waiting = state.joins.length;
  return (
    <section className="view">
      <div className="hero">
        <p className="eyebrow">Alex is asleep</p>
        <p className="countdown">{duration(state.alarmAt! - now)}</p>
        <p className="hero-label">until his alarm goes off</p>
        <p className="hero-sub">Set for {clock(state.alarmAt!)}</p>
      </div>
      <div className="cta-block">
        <button className={`cta ${mine ? "done" : ""}`} onClick={onDisappoint} disabled={mine}>
          {mine ? "You're disappointed in advance" : "Be disappointed in advance"}
        </button>
        <p className="cta-note">
          {mine
            ? "Noted. You'll count the second his alarm goes off."
            : "Why wait? He's going to sleep in. Get your disappointment in early."}
        </p>
      </div>
      <dl className="stats">
        <Row label="Disappointed in advance" value={waiting.toLocaleString()} />
        <Row label="Index when the alarm goes off" value={(SELF + waiting).toLocaleString()} />
      </dl>
    </section>
  );
}

function Live({ state, now, mine, onDisappoint }: { state: BedState; now: number; mine: boolean; onDisappoint: () => void }) {
  const n = SELF + state.joins.length;
  const pm = personMinutes(state.alarmAt!, state.joins, now);
  const last = state.joins[state.joins.length - 1];
  return (
    <section className="view">
      <div className="hero">
        <p className="eyebrow">The Disappointment Index</p>
        <p className="index-n" aria-live="polite">
          <span key={n} className="pop">
            {n.toLocaleString()}
          </span>
        </p>
        <p className="hero-label">{n === 1 ? "person is disappointed in Alex for sleeping in" : "people are disappointed in Alex for sleeping in"}</p>
        <p className="hero-sub">{n === 1 ? "It's Alex." : "One of them is Alex."}</p>
      </div>

      <div className="cta-block">
        <button className={`cta ${mine ? "done" : ""}`} onClick={onDisappoint} disabled={mine}>
          {mine && <Check />}
          {mine ? "You're disappointed in him" : "Be disappointed in him"}
        </button>
        <p className="cta-note">
          {mine
            ? "His alarm just got louder. You'll know when he's up."
            : `His alarm went off ${duration(now - state.alarmAt!)} ago. He is still in bed.`}
        </p>
      </div>

      <dl className="stats">
        <Row label="Overslept by" value={duration(now - state.alarmAt!)} />
        <Row label="Disappointment-minutes" note="people × minutes" value={pm.toFixed(1)} />
        <Row label="Newest disappointment" value={!last ? "Nobody yet" : last <= state.alarmAt! ? "Before the alarm" : `${duration(now - last)} ago`} />
      </dl>

      <DisappointmentChart alarmAt={state.alarmAt!} joins={state.joins} end={now} live />
    </section>
  );
}

function Morning({ state, justWoke }: { state: BedState; justWoke: boolean }) {
  const w = state.woke;
  if (!w || w.count === 0) {
    // He got up before the alarm. Anyone who was disappointed in advance was disappointed for nothing.
    const early = w ? state.joins.length : 0;
    return (
      <section className="view center">
        <p className="eyebrow">Alex is awake</p>
        <h1 className="headline">{early ? "He got up on time." : "Nobody is disappointed."}</h1>
        <p className="lede">
          {early
            ? `${people(early)} ${early === 1 ? "was" : "were"} disappointed in advance. For nothing. Check back the next time he sets an alarm.`
            : "Yet. Check back the next time he sets an alarm."}
        </p>
      </section>
    );
  }
  return (
    <section className="view">
      <div className="hero left">
        <p className="eyebrow">{justWoke ? "It worked" : `Alex got up at ${clock(w.at)}`}</p>
        <h1 className="headline">Congratulations, you have woken Alex.</h1>
        <p className="lede">
          It took {people(w.count)}
          {w.count > 1 ? " (including Alex)" : " (Alex)"} and {duration(w.at - w.alarmAt)} of sleeping in.
        </p>
      </div>
      <dl className="stats">
        <Row label="Final Disappointment Index" value={w.count.toLocaleString()} />
        <Row label="Overslept by" value={duration(w.at - w.alarmAt)} />
        <Row label="Disappointment-minutes" note="people × minutes" value={w.personMinutes.toFixed(1)} />
      </dl>
      <DisappointmentChart alarmAt={w.alarmAt} joins={state.joins} end={w.at} />
    </section>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="row">
      <dt>
        {label}
        {note && <small>{note}</small>}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function Check() {
  return (
    <svg className="check" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M3.5 9.5l3.6 3.6 7.4-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function askForNotifications() {
  try {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* not supported */
  }
}

function notify(count: number) {
  document.title = "Alex is awake · Clinomania";
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Congratulations, you have woken Alex.", { body: `It took ${people(count)}.` });
    }
  } catch {
    /* not supported */
  }
}
