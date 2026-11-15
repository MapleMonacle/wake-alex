// Shared room-wide counter backed by a Durable Object. Polls so every phone stays in sync.
import { useCallback, useEffect, useState } from "react";

export function useCounter(name: string, pollMs = 1500) {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch(`/api/counter/${encodeURIComponent(name)}`)
        .then((r) => r.json() as Promise<{ value: number }>)
        .then((d) => alive && setValue(d.value))
        .catch(() => {});
    pull();
    const id = setInterval(pull, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [name, pollMs]);

  const add = useCallback(
    async (by = 1) => {
      setValue((v) => (v ?? 0) + by); // optimistic
      const r = await fetch(`/api/counter/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ by }),
      });
      const d = (await r.json()) as { value: number };
      setValue(d.value);
      return d.value;
    },
    [name],
  );

  return { value, add };
}
