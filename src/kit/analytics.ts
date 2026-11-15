// Amplitude (they sponsor "stupidest metric" + the $500 prize). Set VITE_AMPLITUDE_KEY in .env.local.
// Without a key, events just go to the console so nothing breaks.
import * as amplitude from "@amplitude/analytics-browser";

const key = import.meta.env.VITE_AMPLITUDE_KEY as string | undefined;
let ready = false;

export function initAnalytics() {
  if (!key || ready) return;
  amplitude.init(key, { autocapture: { elementInteractions: true } });
  ready = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (ready) amplitude.track(event, props);
  else console.info("[track]", event, props ?? "");
}
