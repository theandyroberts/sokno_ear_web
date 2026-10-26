import type { Episode, Story, Block } from "./schema";
import { matchVenue, type VenueRegistry } from "./venues";

// Site search. One index built from the published episodes (never the drafts —
// callers pass loadEpisodes(), whose default directory is content/episodes), with
// three result destinations: an article's own permalink, a venue page that lists
// every event we have covered there, and a place page for one of the location pills.
// Everything here is pure so it can be tested against the real content.

export type ArticleEntry = {
  slug: string;
  storyId: string;
  href: string;
  title: string;
  deck?: string;
  /** The location pill, normalised to house style ("Ijams Park" → "Ijams Nature Center"). */
  label: string;
  labelColor: Story["labelColor"];
  categoryKey: string;
  venueKey?: string;
  venueName?: string;
  image?: string;
  ticket?: Story["ticket"];
  /** event.startDate when the story has one, else the episode date (a bare YYYY-MM-DD). */
  startDate: string;
  endDate?: string;
  /** The event's own start, when there is one — a row shows a day and time from it. */
  eventStart?: string;
  episodeNumber: number;
  episodeDate: string;
  episodeShortDate?: string;
  /** The story's weekday chips ("Thu", "Sat") — the day page's fallback when there is no event time. */
  days?: string[];
  /** The facts call it an all-day thing, so the time column says so instead of a dash. */
  allDay: boolean;
  /** title + deck + body + facts, lowercased, for matching. */
  text: string;
};

export type VenueEntry = {
  key: string;
  name: string;
  href: string;
  logo: string | null;
  site?: string;
  aliases: string[];
  count: number;
};

export type CategoryEntry = {
  key: string;
  label: string;
  labelColor: Story["labelColor"];
  href: string;
  count: number;
};

export type SearchIndex = {
  articles: ArticleEntry[];
  venues: VenueEntry[];
  categories: CategoryEntry[];
};

export type SearchResults = {
  venues: VenueEntry[];
  categories: CategoryEntry[];
  articles: ArticleEntry[];
};

export const CAPS = { venues: 5, categories: 5, articles: 20 } as const;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Rooms, lawns and landings inside one venue are still that venue. A story's
// locationName says "Mead's Quarry, Ijams Nature Center" or "Kern's Food Hall
// rooftop"; the venue page is the one place. The key is the registry's, so the
// page picks up the logo and site the moment content/venues.json gains the entry.
const FOLDS: { test: RegExp; key: string; name: string }[] = [
  { test: /ijams/i, key: "ijams-nature-center", name: "Ijams Nature Center" },
  { test: /kern['’]?s/i, key: "kerns", name: "Kern's" },
  { test: /hi-?wire/i, key: "hi-wire", name: "Hi-Wire Brewing" },
  { test: /pink cactus/i, key: "the-pink-cactus", name: "The Pink Cactus" },
];

// Old episodes carry the pill the house used at the time; the place page is one place.
const LABEL_FOLDS: Record<string, string> = { "Ijams Park": "Ijams Nature Center" };

export function normaliseLabel(label: string): string {
  return LABEL_FOLDS[label] ?? label;
}

/** What each pill means, from the "SoKno locations" list in content/LEXICON.md. */
export const PLACE_NOTES: Record<string, string> = {
  "old-sevier": "The Sevier Avenue corridor, SoKno's main drag: Honeybee Coffee, Alliance Brewing, SouthSide Garage, the Pink Cactus, Fly by Night.",
  "kerns": "The Kern's Bakery and Food Hall pocket, a couple of cross streets up from the river. Roni's Mac Bar lives here.",
  "ijams-nature-center": "The nature center and its trails; Meads Quarry is part of it. Fireflies, bird banding, the bluegrass jam.",
  "suttree-landing": "Suttree Landing Park, the riverside park down on the waterfront: toward the river at the Citgo on Sevier, down Claude St to Waterfront Dr.",
  "urban-wilderness": "The trail district, anchored by a converted church that now holds a bar, a restaurant and a bike shop, with miles of mountain-biking trails.",
  "island-home": "An established residential community of older homes, east of the Sevier corridor.",
  "sokno": "South Knoxville at large: stories that belong to the whole neighborhood rather than one corner of it.",
  "south-waterfront": "The riverfront strip; a marketing name we rarely use, since it is just South Knoxville.",
};

export type ResolvedVenue = { key: string; name: string; logo: string | null; site?: string; aliases: string[] };

/** The venue a story's locationName belongs to: a fold, a registry match, or a synthesized one. */
export function resolveVenue(locationName: string | undefined, registry: VenueRegistry): ResolvedVenue | null {
  const name = (locationName ?? "").trim();
  if (!name) return null;

  const fromRegistry = (key: string): ResolvedVenue | null => {
    const v = registry[key];
    return v ? { key, name: v.name, logo: v.logo ?? null, site: v.site, aliases: v.match } : null;
  };

  for (const f of FOLDS) {
    if (f.test.test(name)) return fromRegistry(f.key) ?? { key: f.key, name: f.name, logo: null, aliases: [f.name] };
  }
  const match = matchVenue(name, registry);
  if (match) {
    const key = Object.keys(registry).find((k) => registry[k] === match);
    if (key) return fromRegistry(key);
  }
  // Nothing registered yet: the page exists today under a slug of the name and
  // switches to the registry entry (logo, site, canonical name) when one lands.
  const key = slugify(name);
  return key ? { key, name, logo: null, aliases: [name] } : null;
}

function blockText(b: Block): string {
  if (b.type === "subhead") return b.text;
  if (b.type === "agenda") return [b.title ?? "", ...b.rows.map((r) => `${r.time} ${r.what}`)].join(" ");
  return b.text ?? b.runs?.map((r) => r.text).join("") ?? "";
}

function storyText(s: Story): string {
  const parts = [s.title, s.deck ?? "", ...s.body.map(blockText), ...s.facts.map((f) => `${f.label} ${f.value}`)];
  return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildIndex(episodes: Episode[], registry: VenueRegistry): SearchIndex {
  const articles: ArticleEntry[] = [];
  const venues = new Map<string, VenueEntry>();
  const categories = new Map<string, CategoryEntry>();

  for (const e of episodes) {
    for (const s of [e.feature, ...e.stories]) {
      const label = normaliseLabel(s.label);
      const categoryKey = slugify(label);
      const venue = resolveVenue(s.event?.locationName, registry);

      articles.push({
        slug: e.slug,
        storyId: s.id,
        href: `/${e.slug}/${s.id}`,
        title: s.title,
        deck: s.deck,
        label,
        labelColor: s.labelColor,
        categoryKey,
        venueKey: venue?.key,
        venueName: venue?.name,
        image: s.image,
        ticket: s.ticket,
        startDate: s.event?.startDate ?? e.date,
        endDate: s.event?.endDate,
        eventStart: s.event?.startDate,
        episodeNumber: e.number,
        episodeDate: e.date,
        episodeShortDate: e.shortDate,
        days: s.days,
        allDay: s.facts.some((f) => /\ball[- ]?day\b/i.test(`${f.label} ${f.value}`)),
        text: storyText(s),
      });

      if (venue) {
        const v = venues.get(venue.key);
        if (v) v.count += 1;
        else venues.set(venue.key, { ...venue, href: `/venue/${venue.key}`, count: 1 });
      }

      const c = categories.get(categoryKey);
      if (c) c.count += 1;
      else categories.set(categoryKey, { key: categoryKey, label, labelColor: s.labelColor, href: `/place/${categoryKey}`, count: 1 });
    }
  }

  const byCount = <T extends { count: number; name?: string; label?: string }>(a: T, b: T) =>
    b.count - a.count || (a.name ?? a.label ?? "").localeCompare(b.name ?? b.label ?? "");

  return {
    articles,
    venues: [...venues.values()].sort(byCount),
    categories: [...categories.values()].sort(byCount),
  };
}

function tokens(q: string): string[] {
  return q.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

const hasAll = (hay: string, words: string[]) => words.every((w) => hay.includes(w));

/** Ranked, capped results: venues by name or alias, places by label, articles by title, then deck, then body. */
export function search(index: SearchIndex, q: string): SearchResults {
  const words = tokens(q);
  if (words.length === 0) return { venues: [], categories: [], articles: [] };

  const venues = index.venues
    .filter((v) => hasAll(v.name.toLowerCase(), words) || v.aliases.some((a) => hasAll(a.toLowerCase(), words)) || hasAll(v.key, words))
    .slice(0, CAPS.venues);

  const categories = index.categories
    .filter((c) => hasAll(c.label.toLowerCase(), words) || hasAll(c.key, words))
    .slice(0, CAPS.categories);

  const scored = index.articles
    .map((a) => {
      const score = hasAll(a.title.toLowerCase(), words) ? 3
        : a.deck && hasAll(a.deck.toLowerCase(), words) ? 2
        : hasAll(a.text, words) ? 1
        : 0;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || dateKey(y.a.startDate).localeCompare(dateKey(x.a.startDate)));

  return { venues, categories, articles: scored.slice(0, CAPS.articles).map((x) => x.a) };
}

// ---- dates -------------------------------------------------------------------

const TZ = "America/New_York";

/** The calendar date (YYYY-MM-DD) of an instant in South Knoxville; a bare date passes through. */
export function dateKey(iso: string | Date): string {
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return typeof iso === "string" ? iso.slice(0, 10) : "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "Sat Oct 31" for an ISO start; a bare date reads as that calendar day. */
export function formatDay(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00-04:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" })
    .format(d)
    .replace(",", "");
}

/** "7 PM" / "7:30 PM"; empty for a bare date or a midnight start (an all-day listing). */
export function formatTime(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour"), minute = get("minute"), period = get("dayPeriod");
  if (hour === "12" && minute === "00" && period === "AM") return "";
  return `${hour}${minute === "00" ? "" : `:${minute}`} ${period}`;
}

/** The narrow time column: "7 PM", or "all day" when the facts say so, or a dash. */
export function timeCell(a: Pick<ArticleEntry, "eventStart" | "allDay">): string {
  const t = a.eventStart ? formatTime(a.eventStart) : "";
  return t || (a.allDay ? "all day" : "—");
}

/** The dim line under a row: "Sat Oct 31 · 7 PM" from the event, else the episode's short date. */
export function dateLine(a: Pick<ArticleEntry, "eventStart" | "episodeShortDate" | "episodeDate">): string {
  if (a.eventStart) {
    const t = formatTime(a.eventStart);
    return t ? `${formatDay(a.eventStart)} · ${t}` : formatDay(a.eventStart);
  }
  return a.episodeShortDate ?? formatDay(a.episodeDate);
}

/** The one-line meta on a search result: "No. 20 · Sat Oct 31 · The 808". */
export function articleMeta(a: ArticleEntry): string {
  return [`No. ${a.episodeNumber}`, a.eventStart ? formatDay(a.eventStart) : a.episodeShortDate ?? formatDay(a.episodeDate), a.venueName]
    .filter(Boolean)
    .join(" · ");
}

/**
 * A venue's rows: what is still to come (today onward, soonest first), then what has
 * been (most recent first). An event that started before today but runs through it
 * is still coming up. Compared by South Knoxville calendar date, not by instant.
 */
export function groupVenueEvents(articles: ArticleEntry[], today: string | Date = new Date()): { upcoming: ArticleEntry[]; past: ArticleEntry[] } {
  const t = dateKey(today);
  const upcoming: ArticleEntry[] = [];
  const past: ArticleEntry[] = [];
  for (const a of articles) {
    const last = dateKey(a.endDate ?? a.startDate);
    (last >= t ? upcoming : past).push(a);
  }
  const byStart = (a: ArticleEntry, b: ArticleEntry) => dateKey(a.startDate).localeCompare(dateKey(b.startDate)) || a.startDate.localeCompare(b.startDate);
  upcoming.sort(byStart);
  past.sort((a, b) => byStart(b, a));
  return { upcoming, past };
}

/** Articles for a place, grouped by episode, newest episode first. */
export function groupByEpisode(articles: ArticleEntry[]): { slug: string; number: number; date: string; shortDate?: string; articles: ArticleEntry[] }[] {
  const groups = new Map<string, { slug: string; number: number; date: string; shortDate?: string; articles: ArticleEntry[] }>();
  for (const a of articles) {
    const g = groups.get(a.slug);
    if (g) g.articles.push(a);
    else groups.set(a.slug, { slug: a.slug, number: a.episodeNumber, date: a.episodeDate, shortDate: a.episodeShortDate, articles: [a] });
  }
  return [...groups.values()].sort((a, b) => b.slug.localeCompare(a.slug));
}

// ---- day pages -----------------------------------------------------------------

export const WEEKDAYS = ["thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_FULL: Record<Weekday, string> = { thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const WEEKDAY_CHIP: Record<Weekday, string> = { thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

/** "thursday" / "Thu" / "thu" → "thu"; null for anything that is not a weekend day. */
export function parseWeekday(s: string): Weekday | null {
  const k = s.toLowerCase().slice(0, 3);
  return (WEEKDAYS as readonly string[]).includes(k) ? (k as Weekday) : null;
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * The Thu–Sun dates an episode covers. Episodes publish midweek for the weekend ahead,
 * but the first ones went out on a Saturday for the weekend already under way, so the
 * Thursday is the one within three days of the episode date either way.
 */
export function episodeWeekend(episodeDate: string): Record<Weekday, string> {
  const [y, m, d] = episodeDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun … 4 Thu
  let toThu = (4 - dow + 7) % 7;
  if (toThu > 3) toThu -= 7;
  const thu = addDays(episodeDate, toThu);
  return { thu, fri: addDays(thu, 1), sat: addDays(thu, 2), sun: addDays(thu, 3) };
}

/** "Oct 22" for a bare date. */
export function formatMonthDay(key: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(new Date(`${key}T12:00:00-04:00`));
}

export type DayWeek = { slug: string; number: number; date: string; articles: ArticleEntry[] };

/**
 * One weekday across the episodes, newest first: each episode's events on that day,
 * earliest start first and the ones with no time last. An event is on the day when
 * it runs through that date; a story with no event time counts when its chips say so.
 */
export function groupByWeekday(index: SearchIndex, weekday: Weekday): DayWeek[] {
  const episodes = new Map<string, { number: number; date: string }>();
  for (const a of index.articles) if (!episodes.has(a.slug)) episodes.set(a.slug, { number: a.episodeNumber, date: a.episodeDate });

  const weeks: DayWeek[] = [];
  for (const [slug, ep] of episodes) {
    const day = episodeWeekend(ep.date)[weekday];
    const rows = index.articles.filter((a) => {
      if (a.slug !== slug) return false;
      if (a.eventStart) return dateKey(a.eventStart) <= day && day <= dateKey(a.endDate ?? a.eventStart);
      return (a.days ?? []).includes(WEEKDAY_CHIP[weekday]);
    });
    rows.sort((x, y) => {
      if (x.eventStart && y.eventStart) return new Date(x.eventStart).getTime() - new Date(y.eventStart).getTime();
      return (x.eventStart ? 0 : 1) - (y.eventStart ? 0 : 1);
    });
    weeks.push({ slug, number: ep.number, date: day, articles: rows });
  }
  return weeks.sort((a, b) => b.slug.localeCompare(a.slug));
}
