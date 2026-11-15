// Shared by the worker (authoritative) and the browser (optimistic updates), so both
// apply room operations exactly the same way. Pure TS, no DOM or Workers APIs.

export type RoomState = Record<string, unknown>;

export type RoomOp =
  | { op: "set"; value: RoomState } // replace everything
  | { op: "merge"; value: RoomState } // shallow-merge keys
  | { op: "push"; key: string; item: unknown; max?: number } // append to a list, keep the last `max`
  | { op: "inc"; key: string; by?: number }; // add to a number (votes, stamps, scores)

export const MAX_ROOM_BYTES = 64 * 1024;

export function applyOp(state: RoomState, o: RoomOp): RoomState {
  switch (o.op) {
    case "set":
      return { ...o.value };
    case "merge":
      return { ...state, ...o.value };
    case "push": {
      const prev = Array.isArray(state[o.key]) ? (state[o.key] as unknown[]) : [];
      const max = Math.max(1, Math.min(o.max ?? 100, 500));
      return { ...state, [o.key]: [...prev, o.item].slice(-max) };
    }
    case "inc": {
      const prev = typeof state[o.key] === "number" ? (state[o.key] as number) : 0;
      return { ...state, [o.key]: prev + (o.by ?? 1) };
    }
  }
}

const isObj = (v: unknown): v is RoomState => typeof v === "object" && v !== null && !Array.isArray(v);

// Server-side guard against garbage input. Returns an error message, or null if the op is fine.
export function validateOp(o: unknown): string | null {
  if (!isObj(o)) return "body must be an object";
  switch (o.op) {
    case "set":
    case "merge":
      return isObj(o.value) ? null : "value must be an object";
    case "push":
    case "inc":
      if (typeof o.key !== "string" || !o.key || o.key.length > 100) return "key must be a short string";
      if (o.op === "inc" && o.by !== undefined && (typeof o.by !== "number" || !Number.isFinite(o.by)))
        return "by must be a number";
      return null;
    default:
      return "op must be set | merge | push | inc";
  }
}
