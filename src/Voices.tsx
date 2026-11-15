// /voices: audition the alarm voices and pick one. The choice is saved on this device,
// so open this on the laptop (or phone) that will play the alarm.
import { useState } from "react";
import { VOICES, type Voice } from "./lib/lines";
import { chosenVoice, sayUrl } from "./lib/voice";

const SAMPLE_N = 7;

export default function Voices() {
  const [chosen, setChosen] = useState<Voice>(chosenVoice());
  const [playing, setPlaying] = useState<string | null>(null);

  function play(v: Voice, i: number) {
    const id = `${v}-${i}`;
    const a = new Audio(sayUrl(SAMPLE_N, i, v));
    setPlaying(id);
    a.onended = a.onerror = () => setPlaying((p) => (p === id ? null : p));
    void a.play().catch(() => setPlaying(null));
  }

  function choose(v: Voice) {
    try {
      localStorage.setItem("clinomania-voice-v2", v);
    } catch {
      /* storage blocked: falls back to the default */
    }
    setChosen(v);
  }

  return (
    <main className="voices">
      <h1>Pick the alarm voice</h1>
      <p className="voices-sub">
        Deepgram Aura-2 voices. Your pick is saved on this device, so choose on the laptop or phone that plays the alarm.
      </p>
      <ul>
        {VOICES.map((v) => (
          <li key={v} className={v === chosen ? "is-chosen" : ""}>
            <span className="v-name">{v}</span>
            <button onClick={() => play(v, 0)} disabled={playing === `${v}-0`}>
              {playing === `${v}-0` ? "Playing…" : "Wake up!"}
            </button>
            <button onClick={() => play(v, 3)} disabled={playing === `${v}-3`}>
              {playing === `${v}-3` ? "Playing…" : "Move it!"}
            </button>
            <button className="use" onClick={() => choose(v)} disabled={v === chosen}>
              {v === chosen ? "Chosen" : "Use this"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
