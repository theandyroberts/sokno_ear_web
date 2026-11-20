import fs from "node:fs";
import path from "node:path";

// Ear Alerts (content/alerts.json): short, time-boxed notices with their own page
// at /alerts/<slug> and a banner on the episode page while they run.
export type EarAlert = {
  slug: string;
  label: string;
  banner: string;
  title: string;
  deck?: string;
  from: string; // YYYY-MM-DD, America/New_York, inclusive
  until: string; // YYYY-MM-DD, America/New_York, inclusive
  closedNote?: string;
  image?: string;
  imageAlt?: string;
  body: string[];
  cta?: { text: string; href: string };
  links?: { text: string; href: string }[];
};

/** Today in SoKno's timezone, as YYYY-MM-DD. */
export function earToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function loadAlerts(file = path.join(process.cwd(), "content", "alerts.json")): EarAlert[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(raw?.alerts) ? raw.alerts : [];
  } catch {
    return [];
  }
}

export const isRunning = (a: EarAlert, today: string) => a.from <= today && today <= a.until;
export const isClosed = (a: EarAlert, today: string) => today > a.until;

/** Alerts whose banner should show today, soonest deadline first. */
export function activeAlerts(alerts: EarAlert[] = loadAlerts(), today: string = earToday()): EarAlert[] {
  return alerts.filter((a) => isRunning(a, today)).sort((x, y) => x.until.localeCompare(y.until));
}

export function getAlert(slug: string, alerts: EarAlert[] = loadAlerts()): EarAlert | undefined {
  return alerts.find((a) => a.slug === slug);
}
