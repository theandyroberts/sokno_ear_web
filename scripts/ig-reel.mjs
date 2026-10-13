// The weekly Reel: the queue entry for the mp4 scripts/ig-reel.py cuts — one quick
// quip per story over that story's artwork, in the briefing's voice. Why it exists:
// in fifteen weeks every one of the account's 131 posts was a still, and stills
// reach followers. Reels are the format Instagram shows to people
// who don't follow you. The first one rides the No. 18 drip (Wed 2026-10-14).
//
// Andy's switch is the dashboard move `weekly-reel`: "Don't" keeps the Reel out of the
// queue with no run in between (ig-queue.mjs reads the answer directly, the way it
// does for the roundup).

/** The move key Andy answers on the dashboard. */
export const REEL_MOVE = "weekly-reel";
/** When the Reel posts on publish day: after the lead pair, in the hour that reads best for stills (13:00, 35 reach a post since Aug 11). */
export const REEL_HOUR = 13;

/** Off only if Andy said no. No answer, "go", or no store at all means on. */
export function reelIsOn(moves) {
  return !(moves ?? []).some((m) => m.key === REEL_MOVE && m.answer === "no");
}

/**
 * The Reel's queue entry.
 *
 * @param {object} a
 * @param {object} a.episode      the published episode (number, shortDate, date, feature)
 * @param {string} a.videoUrl     public URL of reel.mp4 — Instagram fetches it
 * @param {string} a.coverUrl     public URL of reel.jpg
 * @param {string} [a.hashtags]
 * @param {string} [a.site]
 * @param {number} [a.seconds]    the cut's length, for the caption
 * @param {number} [a.stories]    how many stories the cut carries, for the caption
 */
export function buildReelPost({ episode, videoUrl, coverUrl, hashtags = "", site = "https://soknoear.com", seconds, stories }) {
  const when = episode.shortDate ? ` · ${episode.shortDate}` : "";
  const count = stories ? `${stories} things to do` : "This weekend";
  const length = seconds ? ` in ${Math.round(seconds)} seconds` : "";
  const lines = [
    `${count} in South Knoxville${when}${length}. Sound on.`,
    "",
    `${episode.feature?.title ?? `Episode No. ${episode.number}`}.`,
    "",
    `Every story, with the times and the addresses, is episode No. ${episode.number} — link in bio`,
  ];
  if (hashtags) lines.push("", hashtags);
  return {
    id: "reel",
    title: `Weekly Reel (No. ${episode.number})`,
    videoUrl,
    coverUrl,
    imageUrl: coverUrl,
    caption: lines.join("\n"),
    tags: [],
    postAt: `${episode.date}T${String(REEL_HOUR).padStart(2, "0")}:00:00-04:00`,
    permalink: site,
    dated: false,
    status: "pending",
  };
}
