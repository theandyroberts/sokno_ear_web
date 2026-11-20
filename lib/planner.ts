// The Dirty South party planner (Andy, 2026-11-20): pick one place to eat, one to
// drink and one thing to do, and the page turns them into a game plan you can send.
//
// Pure functions only — the server builds the option lists, the client resolves
// picks against them, and both read and write the same share link.
import type { z } from "zod";
import type { NightDay, NightItem } from "@/lib/nightlife";
import type { Ticket } from "@/lib/schema";

export type PlanCat = "eat" | "drink" | "merry";
export const PLAN_CATS: PlanCat[] = ["eat", "drink", "merry"];
export const PLAN_DAYS: NightDay[] = ["Thu", "Fri", "Sat", "Sun"];
export const CAT_LABEL: Record<PlanCat, string> = { eat: "Eat", drink: "Drink", merry: "Be merry" };

/** One thing a visitor can check for a category. */
export type PlanOption = {
  /** Featured rows keep their nightlife id; directory venues are "v:<key>", stories "s:<id>". */
  id: string;
  cat: PlanCat;
  kind: "featured" | "venue" | "story";
  time?: string;
  /** The event's headline, or the venue name for a directory listing. */
  title: string;
  /** The venue's name as people say it — the one word a passed-over choice shrinks to. */
  brand: string;
  /** The full venue line for a featured row ("Angry Dumplings · 1119 Sevier Ave"). */
  venue?: string;
  address?: string;
  sub?: string;
  href?: string;
  logo?: string | null;
  ticket?: z.infer<typeof Ticket>;
  /** Which icon the row draws (food / drink / music / dance / mic / star). */
  icon: string;
};

export type PlannerData = {
  /** The nightlife file's curated rows for each day, grouped by category. */
  featured: Record<NightDay, Record<PlanCat, PlanOption[]>>;
  /** Every eating and drinking spot the Ear knows in SoKno, for "show all". */
  directory: { eat: PlanOption[]; drink: PlanOption[] };
  /** Every be-merry event for the day: the featured rows plus the episode's stories. */
  merryAll: Record<NightDay, PlanOption[]>;
  /** "Fri, Nov 20" for each night, when the weekend label could be read. */
  dates: Partial<Record<NightDay, string>>;
  /** The weekend a plan link belongs to ("nov-19-22"). Row ids repeat every week, and
   *  link previews are cached per URL, so a link carries its week and goes stale with it. */
  week?: string;
};

export type Picks = Partial<Record<PlanCat, string>>;

/** The nightlife file's icon set folds into the planner's three categories. */
export function catOf(icon?: string): PlanCat {
  if (icon === "food") return "eat";
  if (icon === "drink") return "drink";
  return "merry";
}

export const sortName = (s: string) => s.replace(/^the\s+/i, "").toLowerCase();

/** "7:00 PM" → minutes past midnight, so lists can run in time order. Untimed rows sort last. */
export function minutesOf(time?: string): number {
  const m = time?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 24 * 60 + 1;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function featuredOption(item: NightItem): PlanOption {
  return {
    id: item.id,
    cat: catOf(item.cat),
    kind: "featured",
    time: item.time,
    title: item.headline,
    brand: item.brand ?? item.venue.split(" · ")[0],
    venue: item.venue,
    sub: item.sub,
    href: item.href,
    logo: item.logo ?? null,
    ticket: item.ticket,
    icon: item.cat ?? "star",
  };
}

export function buildFeatured(days: Record<NightDay, NightItem[]>): PlannerData["featured"] {
  const out = {} as PlannerData["featured"];
  for (const day of PLAN_DAYS) {
    const groups: Record<PlanCat, PlanOption[]> = { eat: [], drink: [], merry: [] };
    for (const item of days[day] ?? []) groups[catOf(item.cat)].push(featuredOption(item));
    out[day] = groups;
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Nov 19–22" (with the file's `updated` date for the year) → a date label for each night.
 *  Returns nothing when the first day isn't a Thursday, rather than print a wrong date. */
export function nightDates(weekend: string, updated: string): PlannerData["dates"] {
  const m = weekend.match(/^([A-Z][a-z]{2})\s+(\d{1,2})/);
  const upd = updated.match(/^(\d{4})-(\d{2})/);
  if (!m || !upd) return {};
  const month = MONTHS.indexOf(m[1]);
  if (month < 0) return {};
  let year = Number(upd[1]);
  if (Number(upd[2]) === 12 && month === 0) year += 1; // a December file planning early January
  const thu = new Date(Date.UTC(year, month, Number(m[2]), 12));
  if (thu.getUTCDay() !== 4) return {};
  const out: PlannerData["dates"] = {};
  PLAN_DAYS.forEach((day, i) => {
    const d = new Date(thu.getTime() + i * 86_400_000);
    out[day] = `${day}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  });
  return out;
}

/** "Nov 19–22" → "nov-19-22", the week stamp on a plan link. */
export function weekKey(weekend: string): string {
  return weekend.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The option a pick id points at for one night, or null when it's stale (last week's link). */
export function resolvePick(data: PlannerData, day: NightDay, cat: PlanCat, id?: string): PlanOption | null {
  if (!id) return null;
  const pool = cat === "merry" ? data.merryAll[day] : [...data.featured[day][cat], ...data.directory[cat]];
  return pool.find((o) => o.id === id) ?? null;
}

export type PlanState = { day: NightDay; picks: Picks; types: PlanCat[] };
export type ParsedPlan = Partial<PlanState> & { week?: string };

/** Read the share link: ?day=Fri&eat=…&drink=…&merry=…&t=eat,merry&w=nov-19-22 */
export function parsePlanParams(params: Record<string, string | string[] | undefined>): ParsedPlan {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.slice(0, 120) || undefined;
  };
  const out: ParsedPlan = {};
  const day = one("day");
  if (day && (PLAN_DAYS as string[]).includes(day)) out.day = day as NightDay;
  const picks: Picks = {};
  for (const cat of PLAN_CATS) {
    const id = one(cat);
    if (id) picks[cat] = id;
  }
  if (Object.keys(picks).length) out.picks = picks;
  const t = one("t");
  if (t) {
    const types = PLAN_CATS.filter((c) => t.split(",").includes(c));
    if (types.length) out.types = types;
  }
  const w = one("w");
  if (w) out.week = w;
  return out;
}

/** A link's picks only count in the week it was made: next week the same ids name
 *  different events. A link with no week stamp (made before stamps) is taken as is. */
export function freshPlan(parsed: ParsedPlan, data: PlannerData): ParsedPlan {
  if (parsed.week && data.week && parsed.week !== data.week) {
    const rest = { ...parsed };
    delete rest.picks;
    delete rest.week;
    return rest;
  }
  return parsed;
}

/** The query string that brings a visitor back to exactly this plan. */
export function planQuery(state: PlanState, week?: string): string {
  const q = new URLSearchParams();
  q.set("day", state.day);
  let picked = false;
  for (const cat of PLAN_CATS) {
    if (state.types.includes(cat) && state.picks[cat]) {
      q.set(cat, state.picks[cat]!);
      picked = true;
    }
  }
  if (state.types.length < PLAN_CATS.length) q.set("t", state.types.join(","));
  if (picked && week) q.set("w", week);
  return q.toString();
}

/** Put a night in the order it happens (Andy, 2026-11-20: drinks at four come before
 *  dinner at six). Timed picks trade places by start time; a pick with no time (a venue
 *  from "show all") keeps its eat → drink → be merry slot, and equal times stay in that
 *  order too — so the result never depends on how an untimed pick compares. */
export function inTimeOrder<T extends { option: PlanOption }>(plan: T[]): T[] {
  const timedSlots = plan.map((p, i) => (p.option.time && minutesOf(p.option.time) <= 24 * 60 ? i : -1)).filter((i) => i >= 0);
  const timed = timedSlots.map((i) => plan[i]).sort((a, b) => minutesOf(a.option.time) - minutesOf(b.option.time));
  const out = [...plan];
  timedSlots.forEach((slot, k) => { out[slot] = timed[k]; });
  return out;
}

/** The picks that make the game plan, in the order the night happens. */
export function lineup(data: PlannerData, state: PlanState): { cat: PlanCat; option: PlanOption }[] {
  return inTimeOrder(
    PLAN_CATS.filter((c) => state.types.includes(c))
      .map((cat) => ({ cat, option: resolvePick(data, state.day, cat, state.picks[cat]) }))
      .filter((x): x is { cat: PlanCat; option: PlanOption } => x.option !== null),
  );
}

/** The words that travel with the picture. */
export function shareText(dayLabel: string, plan: { cat: PlanCat; option: PlanOption }[]): string {
  const lines = plan.map(({ cat, option }) => {
    const when = option.time ? `${option.time} · ` : "";
    const what = option.kind === "venue" ? option.title : `${option.brand}: ${option.title}`;
    return `${CAT_LABEL[cat].toUpperCase()} — ${when}${what}`;
  });
  return [`The ${dayLabel} game plan in the Dirty South:`, ...lines].join("\n");
}
