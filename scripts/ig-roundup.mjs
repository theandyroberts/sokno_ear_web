// The weekend roundup: one swipeable post that carries the whole episode, and a cap
// on how many single posts one venue gets in a week.
//
// Why. No. 15 sent 14 single posts and read 4.9 reach each, the lowest on record.
// Nine of them were Ijams program listings, which average 6.9 against 10 for food,
// drink and news; followers went 100 → 101 with roughly four unfollows. The account
// was posting a venue's events calendar one card at a time. Now the calendar goes out
// once, as a carousel that replaces the "new episode" card (the weakest recurring
// format nine weeks running), and single posts are kept for the strongest stories.
// See docs/ig-reviews/2026-09-28.md.
//
// Nothing is lost: a story that doesn't get a single post is in the roundup.
// Andy can turn the whole thing off from the dashboard (move `weekend-roundup`,
// answer "Don't"); ig-queue.mjs then builds the week the old way.

/** Single posts one venue gets in a week. The feature counts. */
export const MAX_SINGLES_PER_VENUE = 3;
/** Instagram's limit on a carousel published through the API. */
export const MAX_SLIDES = 10;
/** Below this many stories a carousel is not worth the swipe; keep the plain card. */
export const MIN_ROUNDUP_STORIES = 3;
/** The move key Andy answers on the dashboard. */
export const ROUNDUP_MOVE = "weekend-roundup";

const DAY_ORDER = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
const DAY_NAME = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

/** Off only if Andy said no. No answer, "go", or no store at all means on. */
export function roundupIsOn(moves) {
  return !(moves ?? []).some((m) => m.key === ROUNDUP_MOVE && m.answer === "no");
}

/**
 * Which posts keep a single slot. Walks the posts in the order the episode lists them
 * (the editor's ranking) and keeps each venue's first MAX_SINGLES_PER_VENUE; the
 * feature is always kept. Untagged posts are never folded.
 *
 * @param {Array<{id: string, tags: string[], feature?: boolean}>} posts
 * @returns {{keep: string[], fold: string[]}} ids
 */
export function pickSingles(posts, { max = MAX_SINGLES_PER_VENUE } = {}) {
  const count = new Map();
  const keep = [], fold = [];
  // The feature takes its venue's first place whatever its position in the list.
  const ordered = [...posts.filter((p) => p.feature), ...posts.filter((p) => !p.feature)];
  for (const p of ordered) {
    const venue = p.tags?.[0]?.toLowerCase();
    if (!venue) { keep.push(p.id); continue; }
    const n = count.get(venue) ?? 0;
    if (p.feature || n < max) { keep.push(p.id); count.set(venue, n + 1); }
    else fold.push(p.id);
  }
  return { keep, fold };
}

function firstDay(story) {
  const i = DAY_ORDER.findIndex((d) => d.toLowerCase() === String(story.days?.[0] ?? "").slice(0, 3).toLowerCase());
  return i < 0 ? DAY_ORDER.length : i;
}
const startOf = (story) => (story.event?.startDate ? new Date(story.event.startDate).getTime() : Infinity);

/** What a slide is called in the caption: the banner's own first line, else the title. */
export function shortTitle(story) {
  return String(story.social?.igBanner?.[0] || story.title || story.id).trim();
}

/**
 * Pick stories for the weekend roundup so it looks like the weekend, not like one
 * venue's calendar: a first pass takes each venue's top story, a second pass each
 * venue's next, and so on, in the editor's order, until the slides run out.
 * No. 15 had eleven Ijams Park stories out of sixteen; taken in order the roundup
 * would have been nine slides of one place.
 */
export function chooseVaried(stories, room, venueOf) {
  const lanes = new Map();
  for (const s of stories) {
    const v = venueOf(s) || `~${s.id}`; // an untagged story is its own venue
    lanes.set(v, [...(lanes.get(v) ?? []), s]);
  }
  const out = [];
  for (let pass = 0; out.length < room; pass++) {
    const row = [...lanes.values()].map((l) => l[pass]).filter(Boolean);
    if (!row.length) break;
    out.push(...row.slice(0, room - out.length));
  }
  return out;
}

function dayLines(chosen) {
  const byDay = new Map();
  for (const s of chosen) {
    const d = DAY_NAME[DAY_ORDER[firstDay(s)]] ?? "This week";
    byDay.set(d, [...(byDay.get(d) ?? []), shortTitle(s)]);
  }
  return [...byDay].flatMap(([day, titles]) => [`★ ${day}`, ...titles.map((t) => `  ${t}`), ""]);
}
const inWeekendOrder = (a, b) => firstDay(a) - firstDay(b) || startOf(a) - startOf(b) || a.id.localeCompare(b.id);

/**
 * The weekend roundup, or null when the week is too thin for one. Slides: the cover
 * card, then up to nine stories, varied by venue, in the order the weekend happens.
 *
 * @param {object} a
 * @param {{number: number, shortDate?: string}} a.episode
 * @param {Array<object>} a.stories   every story that has a banner, feature first
 * @param {(story: object) => string} a.bannerUrl
 * @param {string} a.coverUrl
 * @param {(story: object) => string[]} [a.tagsOf]
 * @param {string} [a.hashtags]
 * @param {string} [a.fallbackCaption]  what to say if it has to go out as the plain card
 */
export function buildRoundup({ episode, stories, bannerUrl, coverUrl, tagsOf = () => [], hashtags = "", fallbackCaption }) {
  if (stories.length < MIN_ROUNDUP_STORIES) return null;
  const chosen = chooseVaried(stories, MAX_SLIDES - 1, (s) => tagsOf(s)[0]).sort(inWeekendOrder);
  const tags = [...new Set(chosen.flatMap(tagsOf))];
  const left = stories.length - chosen.length;
  const lines = [
    `This weekend in South Knoxville${episode.shortDate ? ` · ${episode.shortDate}` : ""}`,
    "",
    `Swipe for ${chosen.length} things to do. Save it for Saturday.`,
    "",
    ...dayLines(chosen),
    `Times, tickets and the audio briefing are in episode No. ${episode.number}${left > 0 ? `, with ${left} more` : ""} — link in bio`,
  ];
  if (tags.length) lines.push("", tags.join(" "));
  if (hashtags) lines.push("", hashtags);

  return {
    id: "weekend-roundup",
    title: `Weekend roundup (No. ${episode.number}) · ${chosen.length} stories`,
    imageUrl: coverUrl,
    slides: [coverUrl, ...chosen.map(bannerUrl)],
    stories: chosen.map((s) => s.id),
    caption: lines.join("\n"),
    ...(fallbackCaption ? { fallbackCaption } : {}),
    tags,
  };
}

/** Folded stories a venue needs before they are worth a carousel of their own. */
export const MIN_VENUE_ROUNDUP = 2;

/**
 * One carousel for the stories a venue did not get single posts for: "6 more at
 * Ijams Park this week". Null when there are fewer than MIN_VENUE_ROUNDUP — a lone
 * story keeps its single post instead.
 *
 * @param {object} a
 * @param {string} a.key         registry key, e.g. "ijams"
 * @param {string} a.name        the name copy uses, e.g. "Ijams Park"
 * @param {string} a.handle      "@ijamsnaturecenter"
 * @param {Array<object>} a.stories   the folded stories
 */
export function buildVenueRoundup({ key, name, handle, episode, stories, bannerUrl, hashtags = "" }) {
  if (stories.length < MIN_VENUE_ROUNDUP) return null;
  const chosen = [...stories].slice(0, MAX_SLIDES).sort(inWeekendOrder);
  const lines = [
    `${chosen.length} more at ${name} this week${episode.shortDate ? ` · ${episode.shortDate}` : ""}`,
    "",
    "Swipe through, and save the one you want.",
    "",
    ...dayLines(chosen),
    `Times and tickets are in episode No. ${episode.number} — link in bio`,
    "",
    handle,
  ];
  if (hashtags) lines.push("", hashtags);
  return {
    id: `roundup-${key}`,
    title: `${chosen.length} more at ${name} this week`,
    imageUrl: bannerUrl(chosen[0]),
    slides: chosen.map(bannerUrl),
    stories: chosen.map((s) => s.id),
    caption: lines.join("\n"),
    tags: [handle],
  };
}

/**
 * A carousel that keeps failing becomes the plain card it replaced, so the episode is
 * still announced. Returns the post to try next, or null if it isn't a carousel.
 */
export function downgradeCarousel(post) {
  if (!post.slides?.length) return null;
  const { slides, fallbackCaption, ...rest } = post;
  // "Swipe for nine things" under a single image would be a lie; use the card's own words.
  return { ...rest, imageUrl: slides[0], caption: fallbackCaption ?? rest.caption, downgradedFrom: "carousel" };
}
