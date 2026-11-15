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

// Deepgram Aura-2 male voices to audition at /voices. The first is the default.
export const VOICES = ["zeus", "orion", "arcas", "atlas", "mars", "jupiter", "hyperion", "apollo", "draco", "orpheus"] as const;
export type Voice = (typeof VOICES)[number];
