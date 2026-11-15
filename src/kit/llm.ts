// Talks to POST /api/llm in worker/index.ts. The key never touches the browser.
//
//   const text = await ask("Roast my idea: Uber for geese");
//   const text = await ask("What's in this photo?", { images: [snapshot(videoEl)] });
//   const out  = await askJson<{ verdict: string; score: number }>("Judge this", {
//     schema: { type: "object", properties: { verdict: { type: "string" }, score: { type: "integer" } },
//               required: ["verdict", "score"], additionalProperties: false },
//   });
// With a schema, the reply is guaranteed to match it (structured outputs).

export type JsonSchema = Record<string, unknown>;
export type AskOpts = {
  system?: string;
  maxTokens?: number;
  images?: string[]; // data URLs, e.g. from snapshot()
  effort?: "low" | "medium" | "high"; // default low = fastest
};

async function call(prompt: string, opts: AskOpts & { schema?: JsonSchema }) {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, ...opts }),
  });
  const data = (await res.json()) as { text?: string; json?: unknown; error?: string };
  if (!res.ok) throw new Error(data.error ?? `LLM request failed (${res.status})`);
  return data;
}

export async function ask(prompt: string, opts: AskOpts = {}) {
  return (await call(prompt, opts)).text ?? "";
}

// Without a schema: best-effort parse, null on failure (so a demo never crashes on bad JSON).
export async function askJson<T>(prompt: string, opts: AskOpts & { schema?: JsonSchema } = {}): Promise<T | null> {
  if (opts.schema) {
    try {
      return (await call(prompt, opts)).json as T;
    } catch {
      return null;
    }
  }
  const text = await ask(`${prompt}\n\nReply with only JSON, no prose, no code fences.`, opts).catch(() => "");
  try {
    return JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()) as T;
  } catch {
    return null;
  }
}
