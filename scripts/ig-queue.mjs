// Build the week's Instagram drip queue from the published episode.
//   node scripts/ig-queue.mjs            → build queue for the latest episode, print for review
//   node scripts/ig-queue.mjs <slug>     → build for a specific episode
//   node scripts/ig-queue.mjs --json     → machine-readable only
//
// One post per story, scheduled on the day the thing actually happens (stories
// carry `days` already). The feature and any undated news post on publish day.
// Nothing is sent from here — this only stages. Approve with ig-approve.mjs.
process.env.TZ = "America/New_York"; // all slot math is SoKno-local
import fs from "node:fs";
import path from "node:path";
import { spaceOutPosts, MIN_GAP_MIN, nextLeadWindow, DAY_START_HOUR, placeDaySlots, SAME_DAY_GAP_H } from "./ig-schedule.mjs";
import { priorRunsById, pickRepeatsToDrop, standingKeyOf, MAX_REPEATS_PER_EPISODE } from "./ig-repeats.mjs";
import { checkBanner } from "./ig-banner-check.mjs";

const SITE = "https://soknoear.com";
const BASE_HASHTAGS = "#SoKno #SouthKnoxville #Knoxville #SouthKnoxvilleEar";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_HOUR = 9;

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const slugArg = args.find((a) => !a.startsWith("--"));

const episodesDir = path.join(process.cwd(), "content", "episodes");
const slug = slugArg || fs.readdirSync(episodesDir).filter((f) => f.endsWith(".json")).sort().at(-1).replace(".json", "");
const episode = JSON.parse(fs.readFileSync(path.join(episodesDir, `${slug}.json`), "utf8"));

const handlesPath = path.join(process.cwd(), "content", "ig-handles.json");
const registry = fs.existsSync(handlesPath) ? JSON.parse(fs.readFileSync(handlesPath, "utf8")) : { handles: {} };

/** Map a day abbreviation ("Fri") to the real date inside this episode's week. */
function dateForDay(episodeDate, dayAbbr) {
  const start = new Date(`${episodeDate}T12:00:00-04:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (DOW[d.getDay()].toLowerCase() === String(dayAbbr).toLowerCase().slice(0, 3)) return d;
  }
  return start;
}

function iso(date, hour) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00:00-04:00`;
}

/** Resolve tags → only handles present in the verified registry survive. */
function resolveTags(story) {
  const wanted = story.social?.igTags ?? [];
  const good = [];
  const unknown = [];
  for (const t of wanted) {
    const key = t.replace(/^@/, "").toLowerCase();
    const entry = Object.entries(registry.handles ?? {}).find(
      ([k, v]) => k.toLowerCase() === key || String(v.handle ?? "").replace(/^@/, "").toLowerCase() === key
    );
    if (entry && entry[1].handle) good.push(entry[1].handle.startsWith("@") ? entry[1].handle : `@${entry[1].handle}`);
    else unknown.push(t);
  }
  return { tags: [...new Set(good)], unknown };
}

/** First fact matching the earliest pattern that hits — order is the priority. */
function pickFact(story, patterns) {
  for (const re of patterns) {
    const hit = (story.facts ?? []).find((f) => re.test(f.label));
    if (hit) return hit.value;
  }
  return undefined;
}

function buildCaption(story, tags) {
  const promo = story.social?.igPromo || story.deck || story.title;
  // "When" first, then a curtain/kickoff time, then a day-labelled row as a fallback —
  // otherwise a facts strip like "Thu Jul 16 · The Merry Wives of Windsor" wins and the
  // caption advertises the play title where the time should be.
  const when = pickFact(story, [/^when$/i, /^(curtain|kickoff|showtime)$/i, /^(mon|tue|wed|thu|fri|sat|sun)/i]);
  const where = pickFact(story, [/^where$/i, /^venue$/i]);

  const lines = [story.title, "", promo];
  const bullets = [];
  if (when) bullets.push(`★ ${when}`);
  if (where) bullets.push(`★ ${where}`);
  if (bullets.length) lines.push("", ...bullets);
  lines.push("", "Full story at soknoear.com — link in bio");
  if (tags.length) lines.push("", tags.join(" "));
  lines.push("", BASE_HASHTAGS);
  return lines.join("\n");
}

/**
 * When to post so the reader can still act on it. Aim ~3h ahead of the doors.
 * A morning event is useless to promote that morning, so it gets a heads-up the
 * evening before instead. Collisions are resolved later, by placeDaySlots.
 */
function slotFor(story, dayDate) {
  let date = new Date(dayDate);
  let hour = DEFAULT_HOUR;
  const start = story.event?.startDate ? new Date(story.event.startDate) : null;
  if (start) {
    const h = start.getHours();
    if (h < 11) {
      date.setDate(date.getDate() - 1); // morning event → tell them the night before
      hour = 19;
    } else {
      hour = Math.max(8, Math.min(19, h - 3));
    }
  }
  // Only the slot it WANTS. Same-day collisions are resolved once every post is
  // known, by placeDaySlots — see the pass after the loop.
  return { date, hour };
}

/** Stable 50/50 split on a story id — same story, same arm, every restage. */
function abBucket(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 2 === 0;
}

const stories = [{ ...episode.feature, __isFeature: true }, ...episode.stories];
const posts = [];
const warnings = [];

for (const s of stories) {
  if (!s.image) continue;
  if (s.social?.igSkip) continue;

  // Feature + undated news announce on publish day; dated items post around their event.
  const firstDay = s.days?.[0];
  const dated = !s.__isFeature && firstDay;
  // Publish day itself — never the day before. Stamping these a day early is what
  // opened four consecutive drips on a Tuesday for a Thursday–Sunday episode.
  const dayDate = dated
    ? dateForDay(episode.date, firstDay)
    : new Date(`${episode.date}T12:00:00-04:00`);

  const { date, hour } = dated
    ? slotFor(s, dayDate)
    : slotFor({ ...s, event: undefined }, dayDate);

  const { tags, unknown } = resolveTags(s);
  if (unknown.length) warnings.push(`${s.id}: no verified handle for ${unknown.join(", ")} — tag dropped`);
  if (!s.social?.igTags?.length) warnings.push(`${s.id}: no igTags set — posting untagged`);

  // The banner has to stand on its own: a venue reshares the image, not the caption.
  for (const p of checkBanner({
    lines: s.social?.igBanner,
    tags: s.social?.igTags,
    dated: Boolean(dated),
    handles: registry.handles,
    skip: Boolean(s.social?.igBannerSkipCheck),
  })) warnings.push(`${s.id}: ${p.message}`);

  // Prefer the titled banner version (scripts/ig-banners.py) when it exists.
  const bannerRel = `/assets/ig/${episode.slug}/${s.id}.jpg`;
  const hasBanner = fs.existsSync(path.join(process.cwd(), "public", bannerRel));

  // A12: half the tagged story banners also carry an in-image `user_tags` mention,
  // captions held identical, so non-follower reach can be read tagged vs untagged.
  // Split deterministically on the story id so restaging never reshuffles a post
  // between arms mid-experiment. See docs/ig-reviews/2026-09-15.md, A12.
  const abGroup = tags.length ? (abBucket(s.id) ? "img-tagged" : "control") : undefined;
  const userTags = abGroup === "img-tagged"
    ? tags.slice(0, 1).map((t) => ({ username: t.replace(/^@/, ""), x: 0.5, y: 0.88 }))
    : undefined;

  posts.push({
    id: s.id,
    title: s.title,
    standingKey: standingKeyOf(s),
    postAt: iso(date, hour),
    imageUrl: `${SITE}${hasBanner ? bannerRel : s.image}`,
    permalink: `${SITE}/${episode.slug}/${s.id}`,
    caption: buildCaption(s, tags),
    tags,
    // Whether this post is pinned to a real event time. ig-post.mjs drops a DATED
    // post whose slot has gone stale (the event has started — posting it is worse
    // than silence) but always publishes an undated one late.
    dated: Boolean(dated),
    ...(abGroup ? { abGroup } : {}),
    ...(userTags ? { userTags } : {}),
    status: "pending",
  });
}

// ── Standing-item cap. A story whose id has already run in an earlier episode is a
// repeat; at most one rides the drip per week, rotating so the same banner does not
// go out with the same caption four weeks running. The episode still carries all of
// them — this only thins the Instagram queue. See scripts/ig-repeats.mjs.
// Counted by standing KEY, not id, so a retitle no longer resets the counter (A10).
const archive = fs
  .readdirSync(episodesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const ep = JSON.parse(fs.readFileSync(path.join(episodesDir, f), "utf8"));
    return { date: ep.date, keys: [ep.feature, ...(ep.stories ?? [])].filter(Boolean).map(standingKeyOf) };
  });
const history = priorRunsById(archive, episode.date);
const declaredStanding = stories.filter((s) => s.social?.standing).map(standingKeyOf);
const droppedKeys = pickRepeatsToDrop(posts.map((p) => p.standingKey), history, { standingKeys: declaredStanding });
if (droppedKeys.length) {
  for (const key of droppedKeys) {
    const h = history.get(key);
    const post = posts.find((p) => p.standingKey === key);
    const alias = post && post.id !== key ? ` (as "${post.id}")` : "";
    warnings.push(h
      ? `${key}${alias}: standing item, ran ${h.runs}× (last ${h.lastRun}) — held out of the drip (cap ${MAX_REPEATS_PER_EPISODE}/week)`
      : `${key}${alias}: declared standing — held out of the drip (cap ${MAX_REPEATS_PER_EPISODE}/week)`);
  }
  for (let i = posts.length - 1; i >= 0; i--) if (droppedKeys.includes(posts[i].standingKey)) posts.splice(i, 1);
}

// ── Same-day spacing (A15). Stories were stamped with the slot they wanted and a
// collision walked +1h, so a busy Sunday went out 08:00/09:00/10:00/11:00. Resolve
// all of them at once instead: two hours apart, collisions walk earlier, overflow
// goes out the evening before. Runs after the standing cap so a held-out repeat
// never takes a slot. See placeDaySlots in scripts/ig-schedule.mjs.
{
  const slots = placeDaySlots(posts.map((p) => ({ key: p.id, day: p.postAt.slice(0, 10), hour: Number(p.postAt.slice(11, 13)) })));
  for (const p of posts) {
    const s = slots.get(p.id);
    const next = `${s.day}T${String(s.hour).padStart(2, "0")}:00:00-04:00`;
    if (next !== p.postAt) warnings.push(`${p.id}: ${s.how === "evening-before" || s.how === "day-before" ? "moved to the day before" : s.how === "earlier" ? "moved earlier" : "shifted"} to keep ${SAME_DAY_GAP_H}h between same-day posts (${p.postAt.slice(5, 16)} → ${next.slice(5, 16)})`);
    p.postAt = next;
  }
}

// ── Weekly promo pair (scripts/ig-promos.py). These OPEN the drip — they announce the
// episode and the tip line, so they must land before the stories they introduce.
// spaceOutPosts honours `lead`/`leadOrder` regardless of the clock times below.
// The promo pair used to be stamped with the clock at build time, so a publish that
// ran after midnight opened the whole drip at 01:45 in the morning. Floor it to the
// episode's own publish day and the daytime window instead; `lead`/`leadOrder` still
// decide the order, so the minute here only has to be sane.
// A9: aim, don't just floor. The old version took max(now, publishDay 09:00) and
// walked it into the 09:00–20:00 band, so a 16:55 publish opened the drip at 17:00 —
// the second-worst cell in the slot table. Now it targets the next 09:00–13:00
// window instead, which on a late publish means the following morning.
//
// The ceiling matters: leads are placed first and spaceOutPosts walks everything
// after them, so a lead pushed to tomorrow morning would drag tonight's stories
// along with it. Clamp the target to just before the earliest story so the cards
// still open the run without displacing the run.
const earliestStoryMs = posts.length
  ? Math.min(...posts.map((p) => new Date(p.postAt).getTime()))
  : Infinity;
// Room for the two lead cards plus a gap before the first story.
const promoCeiling = earliestStoryMs === Infinity
  ? Infinity
  : earliestStoryMs - 3 * MIN_GAP_MIN * 60000;

function isoPromoSlot(min) {
  const openAt = new Date(`${episode.date}T12:00:00-04:00`);
  openAt.setHours(DAY_START_HOUR, 0, 0, 0);
  const floor = Math.max(Date.now(), openAt.getTime());
  const d = new Date(nextLeadWindow(floor, promoCeiling) + min * 60000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00-04:00`;
}
const promoDir = path.join(process.cwd(), "public", "assets", "ig", episode.slug);
const storyTitles = episode.stories.slice(0, 3).map((s) => s.title.split(" — ")[0].split(":")[0]);
const PROMOS = [
  {
    id: "call-the-ear",
    title: "Call the Ear (weekly ad)",
    offset: 0,
    caption: [
      "Know about a show, a pop-up, a grand opening, a food or drink special?",
      "",
      "Call or text the SoKno Ear: 865-252-6500",
      "",
      "A realtime AI assistant answers 24/7, takes the details in one quick conversation, and the city desk takes it from there. No forms, no waiting.",
      "",
      BASE_HASHTAGS,
    ].join("\n"),
  },
  {
    id: "episode-drop",
    title: `New episode (No. ${episode.number})`,
    offset: 1,
    caption: [
      `Episode No. ${episode.number} of The South Knoxville Ear is up — your ${episode.shortDate ?? ""} weekend, all in one place.`,
      "",
      `This week: ${episode.feature.title}. Plus ${storyTitles.join(", ")}, and more.`,
      "",
      "Read it and hear the audio briefing — link in bio",
      "",
      BASE_HASHTAGS,
    ].join("\n"),
  },
];
for (const pr of PROMOS) {
  const rel = `/assets/ig/${episode.slug}/${pr.id}.jpg`;
  if (!fs.existsSync(path.join(process.cwd(), "public", rel))) continue;
  posts.push({
    id: pr.id,
    title: pr.title,
    postAt: isoPromoSlot(pr.offset),
    imageUrl: `${SITE}${rel}`,
    permalink: SITE,
    caption: pr.caption,
    tags: [],
    lead: true,
    leadOrder: pr.offset,
    status: "pending",
  });
}

// Never let a burst out the door: past-due and tightly-packed slots get walked
// forward so at most one post fires per cron tick. See scripts/ig-schedule.mjs.
const { posts: spacedPosts, moved } = spaceOutPosts(posts, Date.now());
if (moved) warnings.push(`${moved} post(s) were past due or too tightly packed — rescheduled to keep ${MIN_GAP_MIN} min between posts`);

const queue = {
  slug: episode.slug,
  episode: `Vol. ${episode.volume} — No. ${episode.number}`,
  approved: false,
  posts: spacedPosts,
};

const outDir = path.join(process.cwd(), "content", "ig-queue");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${episode.slug}.json`);

// Restage-safe merge: NEVER reset what already happened. If a queue exists for this
// slug, carry forward approval + the status of any post that isn't still pending —
// without this, restaging after edits would re-post the whole week.
if (fs.existsSync(outPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
    queue.approved = prev.approved ?? false;
    let kept = 0;
    for (const p of queue.posts) {
      const old = (prev.posts ?? []).find((o) => o.id === p.id);
      if (old && old.status && old.status !== "pending") {
        p.status = old.status;
        if (old.igMediaId) p.igMediaId = old.igMediaId;
        if (old.postedAt) p.postedAt = old.postedAt;
        if (old.error) p.error = old.error;
        kept++;
      }
    }
    if (kept) console.log(`  (merge: preserved ${kept} already-posted/skipped status(es); approved=${queue.approved})`);
  } catch { /* unreadable previous queue — stage fresh */ }
}
fs.writeFileSync(outPath, JSON.stringify(queue, null, 2) + "\n");

if (jsonOnly) {
  console.log(JSON.stringify(queue, null, 2));
} else {
  console.log(`\n★ Instagram queue — ${queue.episode} (${posts.length} posts)`);
  console.log(`  staged at ${path.relative(process.cwd(), outPath)} · approved: ${queue.approved}\n`);
  for (const p of posts) {
    const when = new Date(p.postAt);
    console.log("─".repeat(64));
    console.log(`${DOW[when.getDay()]} ${when.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}   [${p.id}]`);
    console.log(`image: ${p.imageUrl}`);
    console.log(`tags:  ${p.tags.length ? p.tags.join(" ") : "(none)"}`);
    console.log("");
    console.log(p.caption.split("\n").map((l) => "  " + l).join("\n"));
    console.log("");
  }
  console.log("─".repeat(64));
  if (warnings.length) {
    console.log("\n⚠ warnings:");
    for (const w of warnings) console.log(`  · ${w}`);
  }
  console.log(`\nApprove with:  node scripts/ig-approve.mjs ${episode.slug}\n`);
}
