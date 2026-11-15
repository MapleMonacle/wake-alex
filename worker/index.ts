import { Hono } from "hono";
import { DurableObject } from "cloudflare:workers";
import Anthropic from "@anthropic-ai/sdk";
import { applyOp, MAX_ROOM_BYTES, validateOp, type RoomOp, type RoomState } from "../src/kit/roomOps";

type Env = {
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
  COUNTER: DurableObjectNamespace<Counter>;
  ROOM: DurableObjectNamespace<Room>;
};

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json({ ok: true, vibe: "immaculate" }));

// ---------------------------------------------------------------------------
// STUPID API starter (track: "stupidest API"). Replace with your own nonsense.
// Every response is deterministic-ish per input so demos are repeatable.
// ---------------------------------------------------------------------------
const UNITS = ["bananas", "Shrek-heights", "Ottawa winters", "OC Transpo delays", "geese", "shawarmas"];
app.get("/stupid/:thing", (c) => {
  const thing = c.req.param("thing");
  const seed = [...thing].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return c.json({
    thing,
    measurement: { value: (seed % 9000) / 100, unit: UNITS[seed % UNITS.length] },
    confidence: "extremely",
    peer_reviewed: false,
    vibes: seed % 2 ? "ominous" : "suspiciously good",
  });
});

// ---------------------------------------------------------------------------
// SHARED COUNTERS (tracks: "stupidest metric" / "stupidest button").
// GET /api/counter/:name -> { name, value }   POST body { by?: number }
// Everyone in the room hits the same number, which makes great live demos.
// ---------------------------------------------------------------------------
app.get("/counter/:name", async (c) => {
  const name = c.req.param("name");
  const value = await c.env.COUNTER.getByName(name).get();
  return c.json({ name, value });
});
app.post("/counter/:name", async (c) => {
  const name = c.req.param("name");
  const body = await c.req.json<{ by?: number }>().catch(() => ({}) as { by?: number });
  const by = Math.max(-1000, Math.min(1000, Math.trunc(body.by ?? 1)));
  const value = await c.env.COUNTER.getByName(name).add(by);
  return c.json({ name, value });
});

// ---------------------------------------------------------------------------
// SHARED ROOM STATE: a small JSON object every device sees (current round, votes,
// a feed of messages...). GET /api/room/:name -> { state, version }
// POST /api/room/:name with a RoomOp (set | merge | push | inc), see src/kit/roomOps.ts
// ---------------------------------------------------------------------------
app.get("/room/:name", async (c) => c.json(await c.env.ROOM.getByName(c.req.param("name")).read()));
app.post("/room/:name", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const err = validateOp(body);
  if (err) return c.json({ error: err }, 400);
  const res = await c.env.ROOM.getByName(c.req.param("name")).apply(body as RoomOp);
  return "error" in res ? c.json(res, 413) : c.json(res);
});

// ---------------------------------------------------------------------------
// LLM (track: "stupidest AI").
// POST { prompt, system?, maxTokens?, images?: dataURL[], schema?: JSONSchema, effort? }
//   -> { text, json? }   (json is set when you pass a schema: guaranteed to match it)
// The key stays server-side. Put it in .dev.vars locally; `wrangler secret put` on deploy.
// ---------------------------------------------------------------------------
type ImageType = "image/jpeg" | "image/png" | "image/webp";
const IMAGE_TYPES: string[] = ["image/jpeg", "image/png", "image/webp"];

app.post("/llm", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: "No ANTHROPIC_API_KEY set. Copy .dev.vars.example to .dev.vars." }, 501);
  }
  const { prompt, system, maxTokens, images = [], schema, effort } = await c.req.json<{
    prompt?: string;
    system?: string;
    maxTokens?: number;
    images?: string[];
    schema?: Record<string, unknown>;
    effort?: "low" | "medium" | "high";
  }>();
  if (!prompt || prompt.length > 8000) return c.json({ error: "prompt required (max 8000 chars)" }, 400);
  if (images.length > 3) return c.json({ error: "max 3 images" }, 400);

  // data:image/jpeg;base64,.... -> image blocks (images go before the text, per API guidance)
  const imageBlocks = [];
  for (const url of images) {
    const m = /^data:([^;]+);base64,(.+)$/.exec(url);
    if (!m || !IMAGE_TYPES.includes(m[1])) return c.json({ error: "images must be jpeg/png/webp data URLs" }, 400);
    if (m[2].length > 5_000_000) return c.json({ error: "image too large (keep under ~3.5MB)" }, 400);
    imageBlocks.push({
      type: "image" as const,
      source: { type: "base64" as const, media_type: m[1] as ImageType, data: m[2] },
    });
  }

  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.beta.messages.create({
      model: c.env.CLAUDE_MODEL ?? "claude-opus-5-5",
      max_tokens: Math.min(maxTokens ?? 2048, 8192),
      // Low effort = fast replies, which is what a live demo needs.
      output_config: {
        effort: effort ?? "low",
        ...(schema ? { format: { type: "json_schema" as const, schema } } : {}),
      },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        system ??
        "You are an unhinged but harmless assistant at a stupid-ideas hackathon. Be funny and brief. Latency-sensitive; begin your visible answer immediately.",
      messages: [{ role: "user", content: [...imageBlocks, { type: "text" as const, text: prompt }] }],
    });
    if (res.stop_reason === "refusal") return c.json({ text: "I refuse. (The AI said no.)", refused: true });
    if (res.stop_reason === "max_tokens") return c.json({ error: "reply cut off: raise maxTokens" }, 502);
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    if (!schema) return c.json({ text });
    try {
      return c.json({ text, json: JSON.parse(text) });
    } catch {
      return c.json({ error: "model returned invalid JSON", text }, 502);
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: "rate limited, slow down" }, 429);
    if (err instanceof Anthropic.APIError) return c.json({ error: err.message }, 502);
    throw err;
  }
});

export class Counter extends DurableObject<Env> {
  async get(): Promise<number> {
    return (await this.ctx.storage.get<number>("v")) ?? 0;
  }
  async add(by: number): Promise<number> {
    const v = (await this.get()) + by;
    await this.ctx.storage.put("v", v);
    return v;
  }
}

export class Room extends DurableObject<Env> {
  async read(): Promise<{ state: RoomState; version: number }> {
    const [state, version] = await Promise.all([
      this.ctx.storage.get<RoomState>("s"),
      this.ctx.storage.get<number>("v"),
    ]);
    return { state: state ?? {}, version: version ?? 0 };
  }
  // Durable Objects run one request at a time, so read-modify-write here is race-free.
  async apply(o: RoomOp): Promise<{ state: RoomState; version: number } | { error: string }> {
    const cur = await this.read();
    const state = applyOp(cur.state, o);
    if (JSON.stringify(state).length > MAX_ROOM_BYTES) return { error: "room state too big (64KB max)" };
    const version = cur.version + 1;
    await this.ctx.storage.put({ s: state, v: version });
    return { state, version };
  }
}

export default app;
