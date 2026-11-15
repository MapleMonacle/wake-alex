// The Disappointment Index: what everyone else sees.
import { useState } from "react";
import { DisappointmentChart } from "./Chart";
import { api, clock, duration, people, useBed, useNow, type BedState } from "./lib/bed";
import { personMinutes, ringing, SELF } from "./lib/types";
import { deviceId } from "./kit/me";
import { celebrate } from "./kit/sfx";
import { Phone } from "./Phone";

const me = deviceId();

export default function Public({ label }: { label?: string }) {
  const now = useNow(1000);
  const [mine, setMine] = useState(false);
  const [justWoke, setJustWoke] = useState(false);

  const { state, accept } = useBed(1000, (prev, next) => {
    // He just got up: everyone watching gets the congratulations.
    if (prev?.asleep && !next.asleep && next.woke && next.woke.count > 0) {
      setJustWoke(true);
      celebrate();
      setTimeout(celebrate, 700);
      notify(next.woke.count);
    }
    if (!prev?.asleep && next.asleep) {
      setMine(false);
      setJustWoke(false);
    }
  });

  async function disappoint() {
    if (!state || !ringing(state)) return;
    setMine(true);
    askForNotifications();
    const res = await api.disappoint(me).catch(() => null);
    if (res) accept(res);
  }

  if (!state)
    return (
      <Phone dark label={label}>
        <main className="screen public night" />
      </Phone>
    );
  const isRinging = ringing(state, now);
  const theme = state.asleep ? "night" : "day";

  return (
    <Phone dark={state.asleep} label={label}>
      <main className={`screen public ${theme}`}>
        <header className="brand">
          <span className="app-icon" aria-hidden>
            C
          </span>
          <span className="brand-name">
            Clinomania
            <small>The Disappointment Index</small>
          </span>
          <span className="live">
            <i className={isRinging ? "on" : ""} /> {isRinging ? "Live" : state.asleep ? "Alarm set" : "Up"}
          </span>
        </header>

        {state.asleep && !isRinging && <Waiting state={state} now={now} />}
        {isRinging && <Live state={state} now={now} mine={mine} onDisappoint={disappoint} />}
        {!state.asleep && <Morning state={state} justWoke={justWoke} />}

        <footer className="foot">
          At a minimum, Alex is disappointing himself. The question is how many others he's disappointing by sleeping in.
        </footer>
      </main>
    </Phone>
  );
}

function Waiting({ state, now }: { state: BedState; now: number }) {
  return (
    <section className="stage">
      <p className="kicker">Alex is asleep</p>
      <h1 className="big">{duration(state.alarmAt! - now)}</h1>
      <p className="lede">until his alarm goes off ({clock(state.alarmAt!)}). If he sleeps in, you'll be able to be disappointed in him.</p>
      <button className="press" disabled>
        Not yet
      </button>
    </section>
  );
}

function Live({ state, now, mine, onDisappoint }: { state: BedState; now: number; mine: boolean; onDisappoint: () => void }) {
  const n = SELF + state.joins.length;
  const pm = personMinutes(state.alarmAt!, state.joins, now);
  const last = state.joins[state.joins.length - 1];
  return (
    <section className="dash">
      <div className="hero">
        <p className="kicker">Alex's alarm went off {duration(now - state.alarmAt!)} ago. He is still in bed.</p>
        <p className="index">
          <span className="n">{n}</span>
          <span className="label">
            {n === 1 ? "person disappointed: Alex himself" : `people disappointed in Alex right now (one of them is Alex)`}
          </span>
        </p>
        <button className={`press ${mine ? "done" : ""}`} onClick={onDisappoint} disabled={mine}>
          {mine ? "You're disappointed" : "Be disappointed in him"}
        </button>
        {mine && <p className="hint">His alarm just got louder. Keep this page open. You'll know when he's up.</p>}
      </div>

      <div className="tiles">
        <Tile label="Overslept by" value={duration(now - state.alarmAt!)} />
        <Tile label="Disappointment-minutes" value={pm.toFixed(1)} note="person × minutes" />
        <Tile label="Newest disappointment" value={last ? `${duration(now - last)} ago` : "nobody yet"} />
      </div>

      <DisappointmentChart alarmAt={state.alarmAt!} joins={state.joins} end={now} />
    </section>
  );
}

function Morning({ state, justWoke }: { state: BedState; justWoke: boolean }) {
  const w = state.woke;
  if (!w || w.count === 0)
    return (
      <section className="stage">
        <p className="kicker">Alex is up</p>
        <h1 className="big">Nobody is disappointed.</h1>
        <p className="lede">Yet. Keep this page handy for the next time he sets an alarm.</p>
      </section>
    );
  return (
    <section className="dash">
      <div className="hero">
        <p className="kicker">{justWoke ? "It worked" : `This morning, ${clock(w.at)}`}</p>
        <h1 className="big">Congratulations, you have woken Alex.</h1>
        <p className="lede">
          It took {people(w.count)} (including Alex) and {duration(w.at - w.alarmAt)} of sleeping in.
        </p>
      </div>
      <div className="tiles">
        <Tile label="Final index" value={String(w.count)} />
        <Tile label="Overslept by" value={duration(w.at - w.alarmAt)} />
        <Tile label="Disappointment-minutes" value={w.personMinutes.toFixed(1)} note="person × minutes" />
      </div>
      <DisappointmentChart alarmAt={w.alarmAt} joins={state.joins} end={w.at} />
    </section>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {note && <span className="tile-note">{note}</span>}
    </div>
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
  document.title = "☀ Congratulations, you have woken Alex";
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Congratulations, you have woken Alex.", { body: `It took ${people(count)}.` });
    }
  } catch {
    /* not supported */
  }
}
