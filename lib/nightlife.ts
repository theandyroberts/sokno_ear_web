import fs from "node:fs";
import path from "node:path";

export type NightDay = "Thu" | "Fri" | "Sat" | "Sun";

export type NightItem = {
  id: string;
  time: string;
  venue: string;
  headline: string;
  sub?: string;
  href: string;
  /** Icon anchor: food | drink | music | dance | mic | star */
  cat?: string;
};

export type Nightlife = {
  updated: string;
  weekend: string;
  days: Record<NightDay, NightItem[]>;
};

const FILE = path.join(process.cwd(), "content", "nightlife.json");

export function loadNightlife(file: string = FILE): Nightlife {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Nightlife;
}

/** The night to show by default: today if it's a weekend night (Thu–Sun in
 *  SoKno's timezone), otherwise the coming Thursday. */
export function pickDefaultDay(now: Date = new Date()): NightDay {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "America/New_York",
  }).format(now);
  return (["Thu", "Fri", "Sat", "Sun"] as const).includes(weekday as NightDay)
    ? (weekday as NightDay)
    : "Thu";
}
