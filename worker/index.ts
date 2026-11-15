import { Hono } from "hono";
import { DurableObject } from "cloudflare:workers";

import type { BedState } from "../src/lib/types";

type Env = { BED: DurableObjectNamespace<Bed>; OWNER_KEY?: string };

const app = new Hono<{ Bindings: Env }>().basePath("/api");
const bed = (env: Env) => env.BED.getByName("alex");

// Only Alex's own device may put him to sleep or wake him.
const isOwner = (env: Env, key: string | undefined) => !env.OWNER_KEY || key === env.OWNER_KEY;

app.get("/state", async (c) => c.json(await bed(c.env).state()));

app.post("/wake", async (c) => {
  const { id } = await c.req.json<{ id?: string }>().catch(() => ({ id: undefined }));
  if (!id || id.length > 64) return c.json({ error: "id required" }, 400);
  return c.json(await bed(c.env).disappoint(id));
});

app.post("/sleep", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key"))) return c.json({ error: "only Alex can go to sleep" }, 403);
  return c.json(await bed(c.env).sleep());
});

app.post("/awake", async (c) => {
  if (!isOwner(c.env, c.req.header("x-owner-key"))) return c.json({ error: "only Alex can wake up" }, 403);
  return c.json(await bed(c.env).awake());
});

export class Bed extends DurableObject<Env> {
  private async load() {
    const [asleep, since, people, woke] = await Promise.all([
      this.ctx.storage.get<boolean>("asleep"),
      this.ctx.storage.get<number | null>("since"),
      this.ctx.storage.get<string[]>("people"),
      this.ctx.storage.get<BedState["woke"]>("woke"),
    ]);
    return { asleep: asleep ?? false, since: since ?? null, people: people ?? [], woke: woke ?? null };
  }

  private view(s: Awaited<ReturnType<Bed["load"]>>): BedState {
    return { asleep: s.asleep, since: s.since, count: s.people.length, woke: s.woke };
  }

  async state(): Promise<BedState> {
    return this.view(await this.load());
  }

  // Requests run one at a time per object, so this read-modify-write is safe.
  async disappoint(id: string): Promise<BedState & { you: boolean }> {
    const s = await this.load();
    if (s.asleep && !s.people.includes(id) && s.people.length < 100_000) {
      s.people.push(id);
      await this.ctx.storage.put("people", s.people);
    }
    return { ...this.view(s), you: s.people.includes(id) };
  }

  async sleep(): Promise<BedState> {
    const s = { asleep: true, since: Date.now(), people: [] as string[], woke: (await this.load()).woke };
    await this.ctx.storage.put({ asleep: true, since: s.since, people: [] });
    return this.view(s);
  }

  async awake(): Promise<BedState> {
    const s = await this.load();
    if (!s.asleep) return this.view(s);
    const woke = { at: Date.now(), count: s.people.length, slept: Date.now() - (s.since ?? Date.now()) };
    // Keep `people` so visitors can still check "did I help?" after he's up.
    await this.ctx.storage.put({ asleep: false, woke });
    return this.view({ ...s, asleep: false, woke });
  }

  // Did this visitor help wake him last time?
  async helped(id: string) {
    return (await this.load()).people.includes(id);
  }
}

app.get("/helped/:id", async (c) => c.json({ helped: await bed(c.env).helped(c.req.param("id")) }));

export default app;
