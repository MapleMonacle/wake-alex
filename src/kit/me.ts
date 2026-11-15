// A stable id per device, so each phone can get its own role/team/department.
//   const me = deviceId();
//   const dept = pickFor(me, ["Treasury Board of Buttons", "Ministry of Pressing Matters"]);
// Add ?as=<id> to the URL to pretend to be another device while testing.

let cached: string | null = null;

export function deviceId(): string {
  if (cached) return cached;
  const forced = new URLSearchParams(location.search).get("as");
  if (forced) return (cached = forced);
  try {
    cached = localStorage.getItem("device-id");
    if (!cached) {
      cached = crypto.randomUUID().slice(0, 8);
      localStorage.setItem("device-id", cached);
    }
  } catch {
    cached = crypto.randomUUID().slice(0, 8); // private mode: new id per load
  }
  return cached;
}

// Same id always picks the same item.
export function pickFor<T>(id: string, list: readonly T[]): T {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return list[h % list.length];
}

export const shortId = () => crypto.randomUUID().slice(0, 6);
