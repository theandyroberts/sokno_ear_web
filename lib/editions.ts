import fs from "node:fs";
import path from "node:path";
import { EditionSchema, type Edition } from "./schema";

const DEFAULT_DIR = path.join(process.cwd(), "content", "editions");
const DRAFTS_DIR = path.join(process.cwd(), "content", "drafts");

export function loadEditions(dir: string = DEFAULT_DIR): Edition[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const editions = files.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return EditionSchema.parse(raw);
  });
  return editions.sort((a, b) => (a.slug < b.slug ? 1 : -1));
}

export function getLatest(dir?: string): Edition {
  const all = loadEditions(dir);
  if (all.length === 0) throw new Error("No editions found");
  return all[0];
}

export function getBySlug(dir: string | undefined, slug: string): Edition | null {
  return loadEditions(dir).find((e) => e.slug === slug) ?? null;
}

export function getPast(dir?: string): Edition[] {
  return loadEditions(dir).slice(1);
}

/** The queued, unpublished edition (content/drafts) — shown only at /next, never indexed. */
export function getNext(): Edition | null {
  return loadEditions(DRAFTS_DIR)[0] ?? null;
}

/** A draft edition by slug — lets story deep links resolve before publish (noindex). */
export function getDraftBySlug(slug: string): Edition | null {
  return loadEditions(DRAFTS_DIR).find((e) => e.slug === slug) ?? null;
}

/** Reorder an edition so `storyId` is the feature and everything else shuffles down. Null if not found. */
export function promoteStory(edition: Edition, storyId: string): Edition | null {
  const all = [edition.feature, ...edition.stories];
  const promoted = all.find((s) => s.id === storyId);
  if (!promoted) return null;
  return { ...edition, feature: promoted, stories: all.filter((s) => s.id !== storyId) };
}
