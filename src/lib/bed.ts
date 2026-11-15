import { useEffect, useRef, useState } from "react";
import type { BedState } from "./types";

export type { BedState };

const OWNER_KEY_STORE = "wake-alex-owner-key";

export function ownerKey(): string | null {
  if (typedKey) return typedKey;
  const fromUrl = new URLSearchParams(location.search).get("key");
  try {
    if (fromUrl) localStorage.setItem(OWNER_KEY_STORE, fromUrl);
    return fromUrl ?? localStorage.getItem(OWNER_KEY_STORE);
  } catch {
    return fromUrl;
  }
}

let typedKey: string | null = null; // the passcode typed on this page (wins over everything)

export function setOwnerKey(key: string | null) {
  typedKey = key;
  // Drop any ?key= from the address bar: an old link would otherwise keep sending a stale code.
  const url = new URL(location.href);
  if (url.searchParams.has("key")) {
    url.searchParams.delete("key");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  try {
    if (key) localStorage.setItem(OWNER_KEY_STORE, key);
    else localStorage.removeItem(OWNER_KEY_STORE);
  } catch {
    /* storage blocked: the passcode lasts for this page only */
  }
}

// Ask the server whether a passcode is right (defaults to the saved one).
export async function checkOwner(key = ownerKey()): Promise<boolean> {
  if (!key) return false;
  try {
    const r = await fetch("/api/owner", { headers: { "x-owner-key": key } });
    return r.ok && ((await r.json()) as { ok: boolean }).ok;
  } catch {
    return false;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);
  return data;
}

const owner = () => ({ "x-owner-key": ownerKey() ?? "", "content-type": "application/json" });

export const api = {
  state: () => call<BedState>("/api/state"),
  disappoint: (id: string) =>
    call<BedState & { you: boolean }>("/api/disappoint", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }),
  helped: (id: string) => call<{ helped: boolean }>(`/api/helped/${encodeURIComponent(id)}`),
  sleep: (alarmAt: number, speaker: string) =>
    call<BedState>("/api/sleep", { method: "POST", headers: owner(), body: JSON.stringify({ alarmAt, speaker }) }),
  claimSpeaker: (speaker: string) =>
    call<BedState>("/api/speaker", { method: "POST", headers: owner(), body: JSON.stringify({ speaker }) }),
  awake: () => call<BedState>("/api/awake", { method: "POST", headers: owner() }),
};

// Live bed state, polled. `onChange` fires with (previous, next) whenever it changes.
export function useBed(pollMs = 1000, onChange?: (prev: BedState | null, next: BedState) => void) {
  const [state, setState] = useState<BedState | null>(null);
  const prevRef = useRef<BedState | null>(null);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const accept = (next: BedState) => {
    const prev = prevRef.current;
    if (
      prev &&
      prev.asleep === next.asleep &&
      prev.alarmAt === next.alarmAt &&
      prev.joins.length === next.joins.length &&
      prev.woke?.at === next.woke?.at &&
      prev.speaker === next.speaker
    )
      return;
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

// Re-render on an interval so clocks and counters stay live.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });

export const people = (n: number) => (n === 1 ? "1 person" : `${n.toLocaleString()} people`);
