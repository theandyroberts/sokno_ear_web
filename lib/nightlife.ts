import fs from "node:fs";
import path from "node:path";
import { matchVenue, type VenueRegistry } from "@/lib/venues";

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
  /** Filled in at render time from content/venues.json — never stored in the
   *  nightlife file, so a logo swap is one edit in the registry. */
  logo?: string | null;
  /** The venue's canonical name from the registry, for the logo chip. */
  brand?: string;
};

export type Sponsor = {
  name: string;
  kicker: string;
  blurb?: string;
  address: string;
  phone: string;
  hours: string;
  image: string;
  href?: string;
};

export type Nightlife = {
  updated: string;
  weekend: string;
  days: Record<NightDay, NightItem[]>;
  sponsor?: Sponsor;
};

const FILE = path.join(process.cwd(), "content", "nightlife.json");

export function loadNightlife(file: string = FILE): Nightlife {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Nightlife;
}

/** Attach each item's venue logo from the registry. Unregistered venues keep
 *  logo: null — the party page draws a wordmark chip for those, so a new bar
 *  can go on the list before anyone has chased down its logo. */
export function withVenueLogos(days: Record<NightDay, NightItem[]>, registry: VenueRegistry): Record<NightDay, NightItem[]> {
  const decorate = (item: NightItem): NightItem => {
    const venue = matchVenue(item.venue, registry);
    return { ...item, logo: venue?.logo ?? null, brand: venue?.name ?? item.venue.split(" · ")[0] };
  };
  return Object.fromEntries(
    Object.entries(days).map(([day, items]) => [day, items.map(decorate)]),
  ) as Record<NightDay, NightItem[]>;
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

/** The sponsor card runs on the off-days — Monday through Wednesday in SoKno's
 *  timezone — when the page has no "tonight" of its own. */
export function isSponsorDay(now: Date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "America/New_York",
  }).format(now);
  return ["Mon", "Tue", "Wed"].includes(weekday);
}
