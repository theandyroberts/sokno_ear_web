import fs from "node:fs";
import path from "node:path";
import { EpisodeSchema, type Episode } from "./schema";

const DEFAULT_DIR = path.join(process.cwd(), "content", "episodes");
const DRAFTS_DIR = path.join(process.cwd(), "content", "drafts");

export function loadEpisodes(dir: string = DEFAULT_DIR): Episode[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const episodes = files.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return EpisodeSchema.parse(raw);
  });
  return episodes.sort((a, b) => (a.slug < b.slug ? 1 : -1));
}

export function getLatest(dir?: string): Episode {
  const all = loadEpisodes(dir);
  if (all.length === 0) throw new Error("No episodes found");
  return all[0];
}

export function getBySlug(dir: string | undefined, slug: string): Episode | null {
  return loadEpisodes(dir).find((e) => e.slug === slug) ?? null;
}

export function getPast(dir?: string): Episode[] {
  return loadEpisodes(dir).slice(1);
}

/** The queued, unpublished episode (content/drafts) — shown only at /next, never indexed. */
export function getNext(): Episode | null {
  return loadEpisodes(DRAFTS_DIR)[0] ?? null;
}

/** A draft episode by slug — lets story deep links resolve before publish (noindex). */
export function getDraftBySlug(slug: string): Episode | null {
  return loadEpisodes(DRAFTS_DIR).find((e) => e.slug === slug) ?? null;
}

/** Reorder an episode so `storyId` is the feature and everything else shuffles down. Null if not found. */
export function promoteStory(episode: Episode, storyId: string): Episode | null {
  const all = [episode.feature, ...episode.stories];
  const promoted = all.find((s) => s.id === storyId);
  if (!promoted) return null;
  return { ...episode, feature: promoted, stories: all.filter((s) => s.id !== storyId) };
}

const CAL_MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};
const CAL_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Weekday abbreviation ("Thu") for a sidebar calendar row.
 *
 * Rows carry only a month abbrev and a day ("AUG" / "20") — no year — so the year
 * comes from the episode. A row that would land far in the past is read as next
 * year's instead (a late-December episode teasing a January date). Returns
 * undefined for anything unparseable so callers can mark the row undatable rather
 * than filing it under a wrong day.
 */
export function calendarRowDay(month: string, day: string, episodeDate: string): string | undefined {
  const m = CAL_MONTHS[month.trim().toUpperCase().slice(0, 3)];
  const d = Number(String(day).trim());
  if (m === undefined || !Number.isInteger(d) || d < 1 || d > 31) return undefined;

  const ep = new Date(`${episodeDate}T00:00:00`);
  if (Number.isNaN(ep.getTime())) return undefined;

  let dt = new Date(ep.getFullYear(), m, d);
  // More than ~6 months behind the episode reads as next year, not last year.
  if (dt.getTime() < ep.getTime() - 180 * 86400000) dt = new Date(ep.getFullYear() + 1, m, d);
  // JS rolls Feb 31 into March — reject rather than report the rolled-over day.
  if (dt.getMonth() !== m || dt.getDate() !== d) return undefined;

  return CAL_WEEKDAYS[dt.getDay()];
}
