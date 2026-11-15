import { Hono } from "hono";
import { DurableObject } from "cloudflare:workers";
import { personMinutes, ringing, SELF, type BedState, type Woke } from "../src/lib/types";
import { lineFor, LINE_COUNT, VOICES } from "../src/lib/lines";

type Env = { BED: DurableObjectNamespace<Bed>; OWNER_KEY?: string; AI: Ai; ELEVENLABS_API_KEY?: string; ELEVENLABS_VOICE_ID?: string };

const app = new Hono<{ Bindings: Env }>().basePath("/api");
const bed = (env: Env) => env.BED.getByName("alex");

// ---------------------------------------------------------------------------
// The alarm voice: Deepgram Aura-2 on Workers AI.
// GET /api/say?n=7&i=2&voice=zeus -> audio/mpeg
// The server builds the line itself from n and i, so this can't be used to say arbitrary
// text, and every (voice, line) pair is cached at the edge: repeats cost nothing.
// ---------------------------------------------------------------------------


app.get("/say", async (c) => {
  const n = Math.max(1, Math.min(9999, Math.trunc(Number(c.req.query("n")) || 1)));
  const i = Math.max(0, Math.min(LINE_COUNT - 1, Math.trunc(Number(c.req.query("i")) || 0)));
  const voice = (VOICES as readonly string[]).includes(c.req.query("voice") ?? "") ? c.req.query("voice")! : VOICES[0];
  const text = lineFor(n, i);

  const cache = caches.default;
  const key = new Request(`https://say.clinomania/v2/${voice}/${encodeURIComponent(text)}`);
  const hit = await cache.match(key);
  if (hit) return hit;

  // Maverick (ElevenLabs) first if asked for; any failure falls through to the Aura voice.
  let body: BodyInit | null = null;
  let provider = "aura";
  if (voice === "maverick") {
    body = await elevenLabs(c.env, text).catch((e) => (console.error("elevenlabs", e), null));
    if (body) provider = "elevenlabs";
  }
  // Maverick never falls back to a different voice (it would sound like two people); the client skips the line.
  if (!body && voice !== "maverick") body = await aura(c.env, text, voice);
  if (!body) return c.json({ error: "no audio" }, 502);

  const res = new Response(body, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "public, max-age=604800",
      "x-line": encodeURIComponent(text),
      "x-provider": provider,
    },
  });
  // Only cache the voice that was asked for, so a temporary ElevenLabs hiccup isn't stuck in the cache.
  if (voice !== "maverick" || provider === "elevenlabs") c.executionCtx.waitUntil(cache.put(key, res.clone()));
  return res;
});

async function aura(env: Env, text: string, speaker: string): Promise<BodyInit | null> {
  const out: unknown = await env.AI.run("@cf/deepgram/aura-2-en" as never, { text, speaker, encoding: "mp3" } as never);
  if (out instanceof ReadableStream) return out;
  if (out instanceof Response) return out.arrayBuffer();
  if (out && typeof out === "object" && "audio" in out && typeof (out as { audio: unknown }).audio === "string") {
    return Uint8Array.from(atob((out as { audio: string }).audio), (ch) => ch.charCodeAt(0));
  }
  return null;
}

// ElevenLabs v3: the "[shouts]" audio tag is what makes it a drill sergeant instead of a narrator.
// Voice: ELEVENLABS_VOICE_ID if set, otherwise the account's voice named "Maverick" (looked up once).
let maverickId: string | null = null;
async function elevenLabs(env: Env, text: string): Promise<ArrayBuffer | null> {
  if (!env.ELEVENLABS_API_KEY) return null;
  const headers = { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json" };
  const voiceId = env.ELEVENLABS_VOICE_ID ?? maverickId ?? (maverickId = await findVoice(headers, "maverick"));
  if (!voiceId) throw new Error("no voice named Maverick on this ElevenLabs account");
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: `[shouts] ${text}`, model_id: "eleven_v3" }),
  });
  if (!r.ok) throw new Error(`elevenlabs ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.arrayBuffer();
}

async function findVoice(headers: Record<string, string>, name: string): Promise<string | null> {
  const r = await fetch(`https://api.elevenlabs.io/v2/voices?search=${encodeURIComponent(name)}&page_size=50`, { headers });
  if (!r.ok) throw new Error(`elevenlabs voices ${r.status}`);
  const { voices = [] } = (await r.json()) as { voices?: { voice_id: string; name: string }[] };
  const exact = voices.find((v) => v.name.toLowerCase() === name) ?? voices.find((v) => v.name.toLowerCase().includes(name));
  return exact?.voice_id ?? null;
}

// Debug: which ElevenLabs voices this key can see (names only). Owner-only.
app.get("/voices", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key") ?? c.req.query("key"))) return c.json({ error: "owner only" }, 403);
  if (!c.env.ELEVENLABS_API_KEY) return c.json({ elevenlabs: false });
  const r = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", { headers: { "xi-api-key": c.env.ELEVENLABS_API_KEY } });
  const j = (await r.json().catch(() => ({}))) as { voices?: { voice_id: string; name: string }[] };
  return c.json({ elevenlabs: r.ok, status: r.status, voices: (j.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name })) });
});

// Only Alex's own device may set the alarm or get up.
const isOwner = (env: Env, key: string | undefined) => !env.OWNER_KEY || key === env.OWNER_KEY;

app.get("/state", async (c) => c.json(await bed(c.env).state()));

app.post("/disappoint", async (c) => {
  const { id } = await c.req.json<{ id?: string }>().catch(() => ({ id: undefined }));
  if (!id || id.length > 64) return c.json({ error: "id required" }, 400);
  return c.json(await bed(c.env).disappoint(id));
});

app.get("/helped/:id", async (c) => c.json({ helped: await bed(c.env).helped(c.req.param("id")) }));

app.post("/sleep", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key"))) return c.json({ error: "only Alex can set his alarm" }, 403);
  const { alarmAt, speaker } = await c.req.json<{ alarmAt?: number; speaker?: string }>().catch(() => ({ alarmAt: undefined, speaker: undefined }));
  if (typeof alarmAt !== "number" || !Number.isFinite(alarmAt)) return c.json({ error: "alarmAt required" }, 400);
  return c.json(await bed(c.env).sleep(alarmAt, typeof speaker === "string" ? speaker.slice(0, 40) : null));
});

// The device that last tapped "turn the alarm on" becomes the only one that makes sound.
app.post("/speaker", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key"))) return c.json({ error: "only Alex's phone can ring" }, 403);
  const { speaker } = await c.req.json<{ speaker?: string }>().catch(() => ({ speaker: undefined }));
  if (typeof speaker !== "string" || !speaker) return c.json({ error: "speaker required" }, 400);
  return c.json(await bed(c.env).claimSpeaker(speaker.slice(0, 40)));
});

app.post("/awake", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key"))) return c.json({ error: "only Alex can get up" }, 403);
  return c.json(await bed(c.env).awake());
});

type Stored = BedState & { people: string[] };

export class Bed extends DurableObject<Env> {
  private async load(): Promise<Stored> {
    const s = await this.ctx.storage.get<Stored>("bed");
    return { speaker: null, ...(s ?? { asleep: false, alarmAt: null, joins: [], people: [], woke: null }) } as Stored;
  }
  private save(s: Stored) {
    return this.ctx.storage.put("bed", s);
  }
  private view({ people: _people, ...s }: Stored): BedState {
    return s;
  }

  async state(): Promise<BedState> {
    return this.view(await this.load());
  }

  // Requests run one at a time per object, so this read-modify-write is safe.
  async disappoint(id: string): Promise<BedState & { you: boolean }> {
    const s = await this.load();
    // Allowed any time he is asleep: the audience can be disappointed in advance.
    if (s.asleep && !s.people.includes(id) && s.people.length < 5000) {
      s.people.push(id);
      s.joins.push(Date.now());
      await this.save(s);
    }
    return { ...this.view(s), you: s.people.includes(id) };
  }

  async helped(id: string) {
    return (await this.load()).people.includes(id);
  }

  async sleep(alarmAt: number, speaker: string | null): Promise<BedState> {
    const s = await this.load();
    const next: Stored = { asleep: true, alarmAt, joins: [], people: [], woke: s.woke, speaker };
    await this.save(next);
    return this.view(next);
  }

  async claimSpeaker(speaker: string): Promise<BedState> {
    const s = await this.load();
    s.speaker = speaker;
    await this.save(s);
    return this.view(s);
  }

  async awake(): Promise<BedState> {
    const s = await this.load();
    if (!s.asleep || s.alarmAt === null) return this.view(s);
    const now = Date.now();
    const woke: Woke = {
      at: now,
      alarmAt: s.alarmAt,
      count: ringing(s, now) ? SELF + s.joins.length : 0, // up before the alarm = nobody disappointed
      personMinutes: ringing(s, now) ? personMinutes(s.alarmAt, s.joins, now) : 0,
    };
    // Keep joins/people so the last morning's chart and "did I help?" survive until he sleeps again.
    const next: Stored = { ...s, asleep: false, woke };
    await this.save(next);
    return this.view(next);
  }
}

export default app;
