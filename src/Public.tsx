// The page everyone else sees: one button, one number, one shared goal.
import { useEffect, useState } from "react";
import { api, duration, people, useBed, type BedState } from "./lib/bed";
import { deviceId } from "./kit/me";
import { celebrate } from "./kit/sfx";

const me = deviceId();

export default function Public() {
  const [pressed, setPressed] = useState(false);
  const [party, setParty] = useState<{ count: number; helped: boolean } | null>(null);
  const [, tick] = useState(0);

  const { state, accept } = useBed(1000, (prev, next) => {
    // He just woke up: tell everyone, and congratulate the people who did it.
    if (prev?.asleep && !next.asleep && next.woke) {
      void api.helped(me).then(({ helped }) => {
        setParty({ count: next.woke!.count, helped });
        celebrate();
        notify(helped, next.woke!.count);
      });
    }
    if (!prev?.asleep && next.asleep) {
      setPressed(false); // new night, new chance
      setParty(null);
    }
  });

  // Re-render every 30s so "asleep for 2h 14m" stays current.
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function wake() {
    if (!state?.asleep) return;
    setPressed(true);
    askForNotifications();
    const res = await api.wake(me).catch(() => null);
    if (res) accept(res);
  }

  if (!state) return <main className="public loading" />;

  return (
    <main className={`public ${state.asleep ? "night" : "day"}`}>
      <header className="brand">
        <span className="logo" aria-hidden>
          {state.asleep ? "☾" : "☀"}
        </span>
        Wake Alex Up
      </header>

      {state.asleep ? <Asleep state={state} pressed={pressed} onWake={wake} /> : <Awake state={state} party={party} />}

      <footer className="foot">Alex is a clinomaniac. He needs your help. Or at least your disappointment.</footer>
    </main>
  );
}

function Asleep({ state, pressed, onWake }: { state: BedState; pressed: boolean; onWake: () => void }) {
  return (
    <section className="stage">
      <p className="status">
        Alex has been asleep for <b>{duration(Date.now() - (state.since ?? Date.now()))}</b>.
      </p>
      <button className={`wake ${pressed ? "done" : ""}`} onClick={onWake} disabled={pressed}>
        {pressed ? "You're disappointed" : "Wake him up"}
      </button>
      <p className="count">
        <span className="n">{state.count.toLocaleString()}</span>
        <span className="label">{state.count === 1 ? "person is" : "people are"} disappointed in him</span>
      </p>
      {pressed && <p className="hint">His alarm just got louder. Stay here. You'll know when he's up.</p>}
    </section>
  );
}

function Awake({ state, party }: { state: BedState; party: { count: number; helped: boolean } | null }) {
  const woke = state.woke;
  return (
    <section className="stage">
      {party ? (
        <>
          <h1 className="big">Alex is awake.</h1>
          <p className="lede">
            {party.helped
              ? party.count <= 1
                ? "You did it. You woke him up all by yourself."
                : `You did it. You and ${people(party.count - 1)} woke him up.`
              : `${people(party.count)} woke him up. You were not one of them.`}
          </p>
        </>
      ) : (
        <>
          <h1 className="big">Alex is awake.</h1>
          <p className="lede">
            {woke
              ? `Last time it took ${people(woke.count)} and ${duration(woke.slept)} of sleep.`
              : "For now. Keep this page open; you'll be needed."}
          </p>
        </>
      )}
      <p className="hint">The button comes back the next time he falls asleep.</p>
    </section>
  );
}

function askForNotifications() {
  try {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* not supported */
  }
}

function notify(helped: boolean, count: number) {
  document.title = "☀ Alex is awake!";
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Alex is awake.", {
        body: helped ? `You did it. ${people(count)} woke him up. Congratulations.` : `${people(count)} woke him up.`,
      });
    }
  } catch {
    /* not supported */
  }
}
