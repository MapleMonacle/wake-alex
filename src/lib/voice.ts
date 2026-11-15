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

export { lineFor } from "./lines";

// ---------------------------------------------------------------------------
// The neural voice (Deepgram Aura-2 via /api/say), with the browser voice as a fallback.
// ---------------------------------------------------------------------------
import { lineFor as line, VOICES, type Voice } from "./lines";

const VOICE_KEY = "clinomania-voice";

export function chosenVoice(): Voice {
  const fromUrl = new URLSearchParams(location.search).get("voice");
  try {
    if (fromUrl && (VOICES as readonly string[]).includes(fromUrl)) localStorage.setItem(VOICE_KEY, fromUrl);
    const saved = localStorage.getItem(VOICE_KEY);
    if (saved && (VOICES as readonly string[]).includes(saved)) return saved as Voice;
  } catch {
    /* storage blocked */
  }
  return VOICES[0];
}

export const sayUrl = (n: number, i: number, voice: Voice = chosenVoice()) =>
  `/api/say?n=${n}&i=${i}&voice=${voice}`;

// Start downloading a line early (e.g. while the whistle blows), so it plays instantly.
const pending = new Map<string, Promise<Blob | null>>();
export function prefetchLine(n: number, i: number) {
  const url = sayUrl(n, i);
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.blob() : null))
        .catch(() => null),
    );
  }
  return pending.get(url)!;
}

let current: HTMLAudioElement | null = null;
export function stopSpeaking() {
  current?.pause();
  current = null;
  speechSynthesis.cancel();
}

// Speak line i for count n. Maverick (ElevenLabs v3) takes ~8s to generate, so we wait longer for it
// (the alarm keeps beeping meanwhile); the faster voices fall back to the browser voice after 2.5s.
export async function speakLine(n: number, i: number) {
  const wait = chosenVoice() === "maverick" ? 11000 : 2500;
  const blob = await Promise.race([prefetchLine(n, i), new Promise<null>((r) => setTimeout(() => r(null), wait))]);

  if (!blob) return bark(line(n, i));
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  current = audio;
  try {
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
      setTimeout(resolve, 15000);
    });
  } finally {
    URL.revokeObjectURL(url);
    if (current === audio) current = null;
  }
}
