// Server half of the party planner: the builders that read the venue registry
// (which loads from disk) live here so the page's client bundle never pulls in fs.
import { loadNightlife, withVenueLogos, type NightDay, type NightItem, type Nightlife } from "@/lib/nightlife";
import type { Episode } from "@/lib/schema";
import { calendarVenue, loadVenues, matchVenue, type VenueRegistry } from "@/lib/venues";
import { getBySlug, getDraftBySlug, getLatest } from "@/lib/episodes";
import { PLAN_DAYS, buildFeatured, catOf, minutesOf, nightDates, sortName, weekKey, type PlannerData } from "@/lib/planner";

/** The registry's eating and drinking spots (plus Kern's rooms), and any venue on this
 *  week's plan the registry doesn't know yet, so a new place is never missing from its list. */
export function buildDirectory(registry: VenueRegistry, days: Record<NightDay, NightItem[]>): PlannerData["directory"] {
  const out: PlannerData["directory"] = { eat: [], drink: [] };
  for (const [key, v] of Object.entries(registry)) {
    if (v.closed) continue;
    for (const cat of v.serves ?? []) {
      out[cat].push({
        id: `v:${key}`, cat, kind: "venue", title: v.name, brand: v.name,
        address: v.address, href: v.site, logo: v.logo, icon: cat === "eat" ? "food" : "drink",
      });
    }
    for (const room of v.inside ?? []) {
      for (const cat of room.serves) {
        out[cat].push({
          id: `v:${key}/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          cat, kind: "venue", title: room.name, brand: room.name,
          address: `at ${v.name}`, href: v.site, logo: v.logo, icon: cat === "eat" ? "food" : "drink",
        });
      }
    }
  }
  for (const cat of ["eat", "drink"] as const) {
    const known = new Set(out[cat].map((o) => o.brand.toLowerCase()));
    for (const item of PLAN_DAYS.flatMap((d) => days[d] ?? [])) {
      if (catOf(item.cat) !== cat) continue;
      const brand = item.brand ?? item.venue.split(" · ")[0];
      if (known.has(brand.toLowerCase()) || matchVenue(item.venue, registry)) continue;
      known.add(brand.toLowerCase());
      out[cat].push({
        id: `v:row-${item.id}`, cat, kind: "venue", title: brand, brand,
        address: item.venue.split(" · ")[1], href: item.href, logo: item.logo ?? null, icon: item.cat ?? cat,
      });
    }
    out[cat].sort((a, b) => sortName(a.brand).localeCompare(sortName(b.brand)));
  }
  return out;
}

const WEEKDAY: Record<string, NightDay> = { Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

/** A story's start time, but only when the story starts on the night being shown. */
function storyTime(startDate: string | undefined, day: NightDay): string | undefined {
  if (!startDate) return undefined;
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const tz = "America/New_York";
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz }).format(d);
  if (WEEKDAY[weekday] !== day) return undefined;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
}

/** Be merry's "show all": the day's featured events, then every story the episode runs
 *  that night that the plan doesn't already carry. A story the plan files under eat or
 *  drink (the specials board, the bakery) stays out of be merry. */
export function buildMerryAll(
  featured: PlannerData["featured"],
  days: Record<NightDay, NightItem[]>,
  episode: Episode | null,
  registry: VenueRegistry,
): PlannerData["merryAll"] {
  const out = {} as PlannerData["merryAll"];
  const storyId = (href?: string) => (episode && href?.startsWith(`/${episode.slug}/`) ? href.split("/").pop() : undefined);
  const eatOrDrink = new Set(
    PLAN_DAYS.flatMap((d) => days[d] ?? []).filter((i) => catOf(i.cat) !== "merry").map((i) => storyId(i.href)).filter(Boolean),
  );
  const stories = episode ? [episode.feature, ...episode.stories] : [];
  const shortTitle = new Map((episode?.scanner ?? []).map((c) => [c.href.replace(/^#/, ""), c.title]));
  for (const day of PLAN_DAYS) {
    const rows = [...featured[day].merry];
    const carried = new Set(rows.map((o) => storyId(o.href)).filter(Boolean));
    for (const s of stories) {
      if (!s.days?.includes(day) || eatOrDrink.has(s.id) || carried.has(s.id)) continue;
      const place = calendarVenue({ title: s.title, venueKey: s.venueKey }, s, registry);
      rows.push({
        id: `s:${s.id}`, cat: "merry", kind: "story",
        time: storyTime(s.event?.startDate, day),
        title: shortTitle.get(s.id) ?? s.title,
        brand: place.name, venue: place.name, href: `/${episode!.slug}/${s.id}`,
        logo: place.venue?.logo ?? null, ticket: s.ticket, icon: "star",
      });
    }
    out[day] = rows.sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  }
  return out;
}


/** Everything the party page, its link preview and its share picture need, read from
 *  disk once per request: this week's plan with logos, and the planner's lists. */
export function loadPlanner(): { nightlife: Nightlife; days: Record<NightDay, NightItem[]>; planner: PlannerData } {
  const nightlife = loadNightlife();
  const registry = loadVenues();
  // Logos come from content/venues.json, not the nightlife file — one registry,
  // reused wherever a venue shows up.
  const days = withVenueLogos(nightlife.days, registry);
  // The episode the plan's stories belong to: the slug its own links point at (on
  // research day that's the draft), else the latest published episode.
  const slugs = Object.values(nightlife.days).flat()
    .map((i) => i.href?.match(/^\/(\d{4}-\d{2}-\d{2})\//)?.[1]).filter(Boolean) as string[];
  const slug = slugs.sort((a, b) => slugs.filter((s) => s === b).length - slugs.filter((s) => s === a).length)[0];
  let episode: Episode | null = null;
  try {
    episode = (slug && (getBySlug(undefined, slug) ?? getDraftBySlug(slug))) || getLatest();
  } catch {
    episode = null; // no episode to borrow stories from: be merry shows the plan's own rows
  }
  const featured = buildFeatured(days);
  return {
    nightlife,
    days,
    planner: {
      featured,
      directory: buildDirectory(registry, days),
      merryAll: buildMerryAll(featured, days, episode, registry),
      dates: nightDates(nightlife.weekend, nightlife.updated),
      week: weekKey(nightlife.weekend),
    },
  };
}
