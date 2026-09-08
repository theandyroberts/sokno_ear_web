// Scheduling guard for the Instagram queue.
//
// Slots are computed from each story's event time, which is right when the episode
// goes out ahead of its weekend. But publish a day late (or on the episode date
// itself) and the feature/undated slots — pinned to the day before the episode date —
// are already in the past, as is the promo pair, which is stamped "now". ig-post.mjs
// fires anything overdue on the next tick, so all of them go out in one burst: a
// rate-limit risk and a spammy-looking feed.
//
// spaceOutPosts keeps the intended order and leaves comfortably-future slots alone,
// but walks anything past-due (or too tightly packed) forward into a spaced sequence.

/** Minutes between consecutive posts. Above the 15-minute cron tick, so at most one fires per tick. */
export const MIN_GAP_MIN = 20;
/** Don't post the instant the queue is approved — leave room to revoke. */
export const LEAD_MIN = 5;
/** Earliest hour a rescheduled post may land on (ET). */
export const DAY_START_HOUR = 9;
/** First hour a rescheduled post may NOT land on (ET) — 20:00 is the worst slot on record. */
export const DAY_END_HOUR = 20;

const OFFSET = "-04:00";

function toIso(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00${OFFSET}`;
}

/**
 * Nudge a timestamp forward into the daytime posting window, leaving it alone if
 * it is already inside one. Publishing after midnight used to drag the whole
 * past-due half of the queue along with it: the No. 12 drip opened at 01:45,
 * 02:00 and 02:30 because "walk it forward from now" had no floor but `now`.
 * Only ever moves forward.
 */
export function nextDaylightSlot(ms) {
  const d = new Date(ms);
  if (d.getHours() >= DAY_END_HOUR) d.setDate(d.getDate() + 1);
  else if (d.getHours() >= DAY_START_HOUR) return ms;
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d.getTime();
}

/**
 * Posts flagged `lead` always open the run — the weekly promo pair announces the
 * episode and the tip line, so they have to land before the stories they introduce.
 * Ties among them break on `leadOrder`. Everything else follows in time order.
 *
 * @param {Array<{postAt: string, lead?: boolean, leadOrder?: number}>} posts
 * @param {number} nowMs
 * @returns {{posts: Array, moved: number}} new array; `moved` counts rescheduled posts
 */
export function spaceOutPosts(posts, nowMs = Date.now(), opts = {}) {
  const gap = (opts.minGapMin ?? MIN_GAP_MIN) * 60000;
  const lead = (opts.leadMin ?? LEAD_MIN) * 60000;

  let earliest = nowMs + lead;
  let moved = 0;

  const byTime = (a, b) => a.postAt.localeCompare(b.postAt);
  const leaders = posts.filter((p) => p.lead).sort((a, b) => (a.leadOrder ?? 0) - (b.leadOrder ?? 0) || byTime(a, b));
  const rest = posts.filter((p) => !p.lead).sort(byTime);

  const out = [...leaders, ...rest]
    .map((p) => {
      const wanted = new Date(p.postAt).getTime();
      // A slot the editor chose is left exactly as written, whatever hour it names.
      // Only a post we are already moving gets pulled into the daytime window.
      let when = Math.max(wanted, earliest);
      if (when !== wanted) when = nextDaylightSlot(when);
      earliest = when + gap;
      if (when === wanted) return p;
      moved += 1;
      return { ...p, postAt: toIso(when), rescheduledFrom: p.postAt };
    });

  return { posts: out, moved };
}
