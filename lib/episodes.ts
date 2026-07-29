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
