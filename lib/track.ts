// One call to record an action in the site's web stats.
//
// Umami (self-hosted, first-party via /stats/*) is the stats we actually read, through
// scripts/umami.mjs. Its script puts `umami.track(name, data)` on window once it loads;
// before that, or in development where it isn't rendered, there is nothing to call and
// the action is simply not counted. GA4 gets the same event when its id is set.
//
// Names are kebab-case and short; Umami caps an event name at 50 characters and the
// data payload is a flat object of strings and numbers.

type TrackData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: TrackData) => void };
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(name: string, data: TrackData = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(name, data);
  } catch {
    /* a blocked or half-loaded stats script never breaks the page */
  }
  try {
    window.gtag?.("event", name, data);
  } catch {
    /* same */
  }
}
