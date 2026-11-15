// The alarm voice. Browsers only offer their built-in voices, so we pick the deepest,
// most human male voice available and drive it fast and low. Lines are written to be barked.
const NATURAL = [/natural/i, /neural/i, /premium/i, /enhanced/i, /online/i, /google/i];
const MALE = /\b(guy|davis|christopher|eric|andrew|brian|roger|steffan|tony|jason|david|mark|richard|george|daniel|fred|alex|tom|male)\b/i;

let chosen: SpeechSynthesisVoice | null = null;

function score(v: SpeechSynthesisVoice) {
  let s = 0;
  NATURAL.forEach((re, i) => {
    if (re.test(v.name)) s += 60 - i * 6;
  });
  if (MALE.test(v.name)) s += 50;
  if (/female|zira|aria|jenny|hazel|susan|linda|samantha|karen/i.test(v.name)) s -= 40;
  if (/^en[-_](US|CA)/i.test(v.lang)) s += 8;
  else if (/^en/i.test(v.lang)) s += 4;
  else s -= 300;
  return s;
}

export function bestVoice(): SpeechSynthesisVoice | null {
  if (chosen) return chosen;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  chosen = [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
  return chosen;
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener?.("voiceschanged", () => {
    chosen = null;
    bestVoice();
  });
}

export function bark(text: string) {
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = bestVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = 1.3; // clipped and urgent
    u.pitch = 0.55; // gravel
    u.volume = 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
    setTimeout(resolve, 9000); // some browsers never fire onend
  });
}

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

export function lineFor(n: number, i: number) {
  return n <= 1 ? SOLO[i % SOLO.length] : CROWD[i % CROWD.length](n);
}
