import { Hono } from "hono";
import { DurableObject } from "cloudflare:workers";
import { personMinutes, ringing, SELF, type BedState, type Woke } from "../src/lib/types";

type Env = { BED: DurableObjectNamespace<Bed>; OWNER_KEY?: string };

const app = new Hono<{ Bindings: Env }>().basePath("/api");
const bed = (env: Env) => env.BED.getByName("alex");

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
  const { alarmAt } = await c.req.json<{ alarmAt?: number }>().catch(() => ({ alarmAt: undefined }));
  if (typeof alarmAt !== "number" || !Number.isFinite(alarmAt)) return c.json({ error: "alarmAt required" }, 400);
  return c.json(await bed(c.env).sleep(alarmAt));
});

app.post("/awake", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key"))) return c.json({ error: "only Alex can get up" }, 403);
  return c.json(await bed(c.env).awake());
});

type Stored = BedState & { people: string[] };

export class Bed extends DurableObject<Env> {
  private async load(): Promise<Stored> {
    const s = await this.ctx.storage.get<Stored>("bed");
    return s ?? { asleep: false, alarmAt: null, joins: [], people: [], woke: null };
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
    if (ringing(s) && !s.people.includes(id) && s.people.length < 5000) {
      s.people.push(id);
      s.joins.push(Date.now());
      await this.save(s);
    }
    return { ...this.view(s), you: s.people.includes(id) };
  }

  async helped(id: string) {
    return (await this.load()).people.includes(id);
  }

  async sleep(alarmAt: number): Promise<BedState> {
    const s = await this.load();
    const next: Stored = { asleep: true, alarmAt, joins: [], people: [], woke: s.woke };
    await this.save(next);
    return this.view(next);
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
