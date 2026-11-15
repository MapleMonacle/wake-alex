// The alarm's lines. Shared by the browser (captions, fallback voice) and the worker (neural voice),
// so what you hear and what you read are always the same words.
// n = everyone he's disappointing, himself included.
const SOLO = [
  "Your alarm went off! So far you're only disappointing yourself! That's still one too many!",
  "Is that a pillow I see? Drop it! Nobody else knows you're failing yet! Fix that!",
];
const CROWD = [
  (n: number) => `Wake up! ${n} people are disappointed in you for sleeping in!`,
  (n: number) => `On your feet! ${n} people are watching you fail! Live!`,
  (n: number) => `Did anyone say you could sleep in? ${n} people say no! Move!`,
  (n: number) => `Move it, move it, move it! ${n} people are waiting on you!`,
  (n: number) => `${n} people believed in you! That was a mistake! Prove them wrong!`,
  (n: number) => `Drop the blanket! That's ${n} disappointed people, and every one of them is right!`,
];

export const LINE_COUNT = 6;

export function lineFor(n: number, i: number) {
  return n <= 1 ? SOLO[i % SOLO.length] : CROWD[i % CROWD.length](n);
}

// What the alarm yells when he hits Snooze. Picked in turn, one per press.
const SNOOZE = [
  (n: number) => (n <= 1 ? "Snooze? Denied! Even you don't believe in you!" : `Snooze? Denied! ${n} people said no!`),
  (n: number) =>
    n <= 1 ? "Nice try! There is no snooze button! Get up!" : `Nice try! There is no snooze button! ${n} people are watching!`,
  () => "You pressed snooze? You don't get a snooze! You get up!",
  (n: number) =>
    n <= 1 ? "Snooze again and I tell everyone!" : `Snooze again and I tell everyone! Oh wait, ${n} people already know!`,
];
export const SNOOZE_COUNT = SNOOZE.length;
export const snoozeLine = (n: number, i: number) => SNOOZE[i % SNOOZE.length](n);

export type LineKind = "line" | "snooze";
export const textFor = (kind: LineKind, n: number, i: number) => (kind === "snooze" ? snoozeLine(n, i) : lineFor(n, i));

// Voices to audition at /voices. The first is the default.
// "maverick" is the ElevenLabs v3 voice (shouting); the rest are Deepgram Aura-2 on Workers AI.
export const VOICES = ["maverick", "zeus", "orion", "arcas", "atlas", "mars", "jupiter", "hyperion", "apollo", "draco", "orpheus"] as const;
export type Voice = (typeof VOICES)[number];
