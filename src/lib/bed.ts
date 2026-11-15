import { useEffect, useRef, useState } from "react";
import type { BedState } from "./types";

export type { BedState };

const OWNER_KEY_STORE = "wake-alex-owner-key";

export function ownerKey(): string | null {
  const fromUrl = new URLSearchParams(location.search).get("key");
  try {
    if (fromUrl) localStorage.setItem(OWNER_KEY_STORE, fromUrl);
    return fromUrl ?? localStorage.getItem(OWNER_KEY_STORE);
  } catch {
    return fromUrl;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);
  return data;
}

export const api = {
  state: () => call<BedState>("/api/state"),
  wake: (id: string) =>
    call<BedState & { you: boolean }>("/api/wake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }),
  helped: (id: string) => call<{ helped: boolean }>(`/api/helped/${encodeURIComponent(id)}`),
  sleep: () => call<BedState>("/api/sleep", { method: "POST", headers: { "x-owner-key": ownerKey() ?? "" } }),
  awake: () => call<BedState>("/api/awake", { method: "POST", headers: { "x-owner-key": ownerKey() ?? "" } }),
};

// Live bed state, polled. `onChange` fires with (previous, next) whenever it changes.
export function useBed(pollMs = 1000, onChange?: (prev: BedState | null, next: BedState) => void) {
  const [state, setState] = useState<BedState | null>(null);
  const prevRef = useRef<BedState | null>(null);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const accept = (next: BedState) => {
    const prev = prevRef.current;
    if (prev && prev.asleep === next.asleep && prev.count === next.count && prev.woke?.at === next.woke?.at) return;
    prevRef.current = next;
    setState(next);
    cbRef.current?.(prev, next);
  };

  useEffect(() => {
    let alive = true;
    const pull = () => api.state().then((s) => alive && accept(s)).catch(() => {});
    pull();
    const id = setInterval(pull, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return { state, accept };
}

export function duration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m === 0) return "less than a minute";
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export const people = (n: number) => (n === 1 ? "1 person" : `${n.toLocaleString()} people`);
