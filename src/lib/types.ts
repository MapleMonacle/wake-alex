// Shared by the worker and the pages.
export type BedState = {
  asleep: boolean;
  alarmAt: number | null; // when the alarm goes off; disappointment starts here
  joins: number[]; // when each other person became disappointed (ms timestamps, ascending)
  woke: Woke | null; // the last time he got up
  speaker: string | null; // the one device allowed to make sound (so two copies never echo)
};

export type Woke = {
  at: number;
  alarmAt: number;
  count: number; // everyone disappointed, himself included
  personMinutes: number; // total disappointment-minutes
};

// He always disappoints himself the moment the alarm goes off.
export const SELF = 1;

export function ringing(s: Pick<BedState, "asleep" | "alarmAt">, now = Date.now()) {
  return s.asleep && s.alarmAt !== null && now >= s.alarmAt;
}

// Total disappointment, in person-minutes: him since the alarm, plus each person since they joined.
// People who were disappointed in advance only start counting when the alarm actually goes off.
export function personMinutes(alarmAt: number, joins: number[], until: number) {
  const since = (t: number) => Math.max(0, until - Math.max(t, alarmAt));
  const ms = since(alarmAt) + joins.reduce((sum, t) => sum + since(t), 0);
  return ms / 60000;
}

// How many people were waiting, disappointed in advance, when the alarm went off.
export const inAdvance = (alarmAt: number, joins: number[]) => joins.filter((t) => t <= alarmAt).length;
