// Shared JSON state for everyone in the room (laptop on the projector + every phone via QR).
//
//   const room = useRoom("canadat", { stage: "lobby", applications: [] as App[] });
//   room.state.stage                       // typed from the initial value
//   room.merge({ stage: "voting" })        // shallow-merge keys
//   room.push("applications", app, 50)     // append to a list (keeps the last 50)
//   room.inc(`yes-${app.id}`)              // votes / stamps / scores
//   room.count(`yes-${app.id}`)            // read one back (0 if unset)
//   room.set({ stage: "lobby" })           // replace everything (reset)
//
// Updates apply locally at once, then the server's copy wins. Other devices see changes
// on their next poll (default every second). Keep it small: 64KB max per room.
import { useCallback, useEffect, useRef, useState } from "react";
import { applyOp, type RoomOp, type RoomState } from "./roomOps";

type Snapshot = { state: RoomState; version: number };

export function useRoom<T extends RoomState>(name: string, initial: T, pollMs = 1000) {
  const url = `/api/room/${encodeURIComponent(name)}`;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(-1);

  // Only ever move forward, so a slow poll can't overwrite a newer write.
  const accept = useCallback((s: Snapshot) => {
    if (s.version < versionRef.current) return;
    versionRef.current = s.version;
    setSnap(s);
  }, []);

  useEffect(() => {
    let alive = true;
    versionRef.current = -1;
    const pull = () =>
      fetch(url)
        .then((r) => r.json() as Promise<Snapshot>)
        .then((s) => alive && s.version !== versionRef.current && accept(s))
        .catch(() => {});
    pull();
    const id = setInterval(pull, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, pollMs, accept]);

  const send = useCallback(
    async (o: RoomOp) => {
      setSnap((s) => (s ? { ...s, state: applyOp(s.state, o) } : s)); // optimistic
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(o),
      });
      const data = (await r.json()) as Snapshot | { error: string };
      if ("error" in data) {
        setError(data.error);
        versionRef.current = -1; // force the next poll to resync
        return;
      }
      setError(null);
      accept(data);
    },
    [url, accept],
  );

  const state = { ...initial, ...(snap?.state ?? {}) } as T;

  return {
    state,
    ready: snap !== null,
    version: snap?.version ?? 0,
    error,
    set: (value: Partial<T>) => send({ op: "set", value }),
    merge: (value: Partial<T>) => send({ op: "merge", value }),
    push: <K extends keyof T & string>(key: K, item: T[K] extends (infer I)[] ? I : never, max?: number) =>
      send({ op: "push", key, item, max }),
    inc: (key: string, by = 1) => send({ op: "inc", key, by }),
    // Read a number at a dynamic key (e.g. `yes:${id}`), 0 if unset.
    count: (key: string) => {
      const v = (state as RoomState)[key];
      return typeof v === "number" ? v : 0;
    },
  };
}
