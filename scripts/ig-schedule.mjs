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
/** The lead cards' target window (ET). The four best cells in the slot table. */
export const LEAD_WINDOW_START_HOUR = 9;
export const LEAD_WINDOW_END_HOUR = 13;

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
 * The next 09:00–13:00 window at or after `ms`. Used to AIM the lead cards rather
 * than just floor them: `isoPromoSlot` used to take max(now, publishDay 09:00), so a
 * 16:55 publish opened the whole drip at 17:00 — the second-worst cell on record
 * (docs/ig-reviews/2026-09-15.md, finding 7 / A9). Only ever moves forward.
 *
 * @param {number} ms
 * @param {number} [notAfterMs]  a ceiling — usually the first story's slot. If the
 *   morning target would land past it, stay put rather than pushing the drip's own
 *   stories back behind the cards that are supposed to introduce them.
 */
export function nextLeadWindow(ms, notAfterMs = Infinity) {
  const d = new Date(ms);
  if (d.getHours() >= LEAD_WINDOW_END_HOUR) {
    d.setDate(d.getDate() + 1);
    d.setHours(LEAD_WINDOW_START_HOUR, 0, 0, 0);
  } else if (d.getHours() < LEAD_WINDOW_START_HOUR) {
    d.setHours(LEAD_WINDOW_START_HOUR, 0, 0, 0);
  } else {
    return ms; // already inside the window
  }
  return d.getTime() > notAfterMs ? ms : d.getTime();
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

/** Hours between two story posts on the same day. Collisions used to shift +1h. */
export const SAME_DAY_GAP_H = 2;
/** Earliest hour a story post may walk back to. */
export const EARLIEST_STORY_HOUR = 8;
/** Evening-before slots tried, in order, for a post that finds no room on its own morning. */
export const EVENING_SPILL_HOURS = [21, 18];

function dayBefore(day) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Posts naming the same venue on one day. A third reads like the feed repeating itself. */
export const MAX_VENUE_POSTS_PER_DAY = 2;
/** How many days back a post held off its day by the venue cap may look for room. */
export const VENUE_SPILL_DAYS = 3;

/**
 * Place story posts so no two on the same day land within SAME_DAY_GAP_H of each other,
 * and no venue gets more than MAX_VENUE_POSTS_PER_DAY posts on one day.
 *
 * Each post comes in with the slot it WANTS (its event time minus ~3h). The old rule
 * walked a collision one hour LATER, which on a busy day stacks the posts back-to-back
 * and eats into the lead time. No. 14's Sunday went out 08:00 / 09:00 / 10:00 / 11:00,
 * four Ijams banners in a row, and read 4, 5, 2 and 5 — four of the week's five worst
 * (docs/ig-reviews/2026-09-21.md, finding 3 / A15).
 *
 * Now, per day, latest-wanted first: a collision walks EARLIER, which only ever adds
 * lead time. A post with no room left above EARLIEST_STORY_HOUR goes out the evening
 * before (EVENING_SPILL_HOURS), the same "tell them the night before" rule morning
 * events already follow, or failing that any open hour that day. Only if the whole
 * day before is full does it fall back to the old behaviour: the first free hour at
 * or after the slot it wanted.
 *
 * The venue cap (A16) came out of No. 15. Two hours between posts was not enough when
 * the posts were all the same venue: Thursday carried three Ijams banners and Saturday
 * four, every one of them 2h+ apart, and they read 2, 2, 7 and 2, 6, 5, 1 against 6.3
 * for the rest of the week. On record, a banner on a day carrying three or more from
 * one venue averages 4.4; on a day carrying one or two, 9.1 (docs/ig-reviews/
 * 2026-09-28.md, finding 2). A post held off its day by the cap goes out earlier in the week — the
 * evening before first, then further back, never before `floorDay`. Nothing is ever
 * dropped: if the whole week is at the cap the post keeps its own day and comes back
 * marked "over-venue-cap" so the builder can say so.
 *
 * Pure and timezone-free: days are "YYYY-MM-DD" strings, hours are local integers.
 *
 * @param {Array<{key: string, day: string, hour: number, venue?: string}>} items
 *   `venue` is whatever identifies the place (the first tag). Posts without one are
 *   only ever spaced by the clock.
 * @param {{maxPerVenuePerDay?: number, floorDay?: string}} [opts]
 *   `floorDay` is the earliest day a venue-capped post may move to — publish day.
 * @returns {Map<string, {day: string, hour: number, how: "as-wanted"|"earlier"|"evening-before"|"day-before"|"days-before"|"over-venue-cap"|"fallback", venueCapped?: boolean}>}
 */
export function placeDaySlots(items, opts = {}) {
  const maxVenue = opts.maxPerVenuePerDay ?? MAX_VENUE_POSTS_PER_DAY;
  const placed = new Map(); // day → hours[]
  const venues = new Map(); // day → venue[]
  const out = new Map();
  const hoursOn = (day) => placed.get(day) ?? [];
  const fits = (day, h) => hoursOn(day).every((x) => Math.abs(x - h) >= SAME_DAY_GAP_H);
  const venueRoom = (day, venue) =>
    !venue || (venues.get(day) ?? []).filter((v) => v === venue).length < maxVenue;
  const put = (it, day, hour, how, venueCapped) => {
    placed.set(day, [...hoursOn(day), hour]);
    if (it.venue) venues.set(day, [...(venues.get(day) ?? []), it.venue]);
    out.set(it.key, { day, hour, how, ...(venueCapped ? { venueCapped: true } : {}) });
  };
  /** Walk down from `from` to the first hour that fits on `day`, or undefined. */
  const walkEarlier = (day, from) => {
    let h = from;
    while (h >= EARLIEST_STORY_HOUR && !fits(day, h)) h -= 1;
    return h >= EARLIEST_STORY_HOUR ? h : undefined;
  };

  const days = [...new Set(items.map((i) => i.day))].sort();
  for (const day of days) {
    // Latest-wanted first, so the post closest to its event keeps its slot and the
    // earlier ones make room by moving earlier still. Key breaks ties for stability.
    const todays = items
      .filter((i) => i.day === day)
      .sort((a, b) => b.hour - a.hour || a.key.localeCompare(b.key));
    for (const it of todays) {
      // Held off a day by the venue cap, as opposed to by the clock. Only a capped
      // post looks further back than the day before.
      let capped = !venueRoom(day, it.venue);
      if (!capped) {
        const h = walkEarlier(day, it.hour);
        if (h !== undefined) {
          put(it, day, h, h === it.hour ? "as-wanted" : "earlier");
          continue;
        }
      }

      let landed = false;
      let prev = day;
      for (let back = 1; back <= VENUE_SPILL_DAYS && !landed; back++) {
        if (back > 1 && !capped) break;
        prev = dayBefore(prev);
        if (capped && opts.floorDay && prev < opts.floorDay) break;
        if (!venueRoom(prev, it.venue)) { capped = true; continue; }
        const eve = EVENING_SPILL_HOURS.find((eh) => fits(prev, eh));
        // Evening full: any open hour that day, latest first — "this weekend" still
        // lands ahead of the event, which beats a fourth post in a row on the day.
        const h = eve ?? walkEarlier(prev, Math.max(...EVENING_SPILL_HOURS) - 1);
        if (h === undefined) continue;
        put(it, prev, h, back > 1 ? "days-before" : eve !== undefined ? "evening-before" : "day-before", capped);
        landed = true;
      }
      if (landed) continue;

      // No day under the cap. Keep its own day rather than drop it, and say so.
      if (capped) {
        const h = walkEarlier(day, it.hour);
        if (h !== undefined) { put(it, day, h, "over-venue-cap", true); continue; }
      }
      let f = it.hour;
      while (hoursOn(day).includes(f)) f += 1;
      put(it, day, f, "fallback", capped);
    }
  }
  return out;
}
