// Shared by the worker and the pages.
export type BedState = {
  asleep: boolean;
  since: number | null; // when he went to sleep
  count: number; // distinct people disappointed this sleep
  woke: { at: number; count: number; slept: number } | null; // last time he woke up
};
