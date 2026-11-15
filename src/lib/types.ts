// Shared by the worker and the pages.
export type BedState = {
  asleep: boolean;
  alarmAt: number | null; // when the alarm goes off; disappointment starts here
  joins: number[]; // when each other person became disappointed (ms timestamps, ascending)
  woke: Woke | null; // the last time he got up
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
export function personMinutes(alarmAt: number, joins: number[], until: number) {
  const ms = Math.max(0, until - alarmAt) + joins.reduce((sum, t) => sum + Math.max(0, until - t), 0);
  return ms / 60000;
}
