// Post any DUE + APPROVED items from the Instagram queue. Intended for cron on the VPS.
//   node scripts/ig-post.mjs --dry-run     → show what would post right now, send nothing
//   node scripts/ig-post.mjs               → post due items
//   node scripts/ig-post.mjs --force=<id>  → post one item now regardless of schedule
//
// Requires in .env:  IG_USER_ID=<numeric ig professional account id>
//                    IG_ACCESS_TOKEN=<long-lived token; ig-refresh-token.mjs renews it via cron>
//
// Uses the "Instagram API with Instagram Login" flavor (graph.instagram.com) — no
// Facebook Page involved. Meta fetches the image FROM A PUBLIC URL (it will not
// accept bytes), which is why every engraving already living at soknoear.com/assets/
// is the whole ballgame. Two-step publish: create a media container, then publish it.
//
// FAILURE POLICY (A8, docs/ig-reviews/2026-09-15.md). A failure used to be terminal
// and silent: `status = "failed"`, a line in a log file nobody reads, and the post was
// gone for good. Two posts died that way in three weeks — both error 9007 "media is
// not ready for publishing", both AFTER the container reported FINISHED, i.e. both
// transient. Now:
//   · publish is retried in-run on a transient error (short backoff, so a cron tick
//     never overlaps the next one);
//   · a post that still fails stays `pending` with an `attempts` count, so the
//     15-minute cron keeps trying until MAX_ATTEMPTS — free retries, widely spaced;
//   · exhausting the budget marks it `failed` AND calls scripts/notify.mjs;
//   · a DATED post whose event has already started is dropped as `stale` instead of
//     posted hours late — announcing a 7pm show at 11pm is worse than silence. An
//     undated post (the feature, the promo pair, undated news) always goes out late.
process.env.TZ = "America/New_York"; // all slot math is SoKno-local
import fs from "node:fs";
import path from "node:path";
import { publishPost } from "./ig-container.mjs";
import { downgradeCarousel } from "./ig-roundup.mjs";

const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.instagram.com/v22.0";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceId = args.find((a) => a.startsWith("--force="))?.split("=")[1];

const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;

/** Cron ticks to spend on one post before giving up and shouting. ~1h at 15-min ticks. */
const MAX_ATTEMPTS = 4;
/** Tries a carousel gets before it is sent as a single image instead. */
const CAROUSEL_TRIES = 2;
/** How late a DATED post may be before it is dropped rather than published. Slots sit
 *  ~3h ahead of doors, so 4h late means the thing has started. */
const STALE_AFTER_MS = 4 * 60 * 60 * 1000;
const alerts = [];

const dir = path.join(process.cwd(), "content", "ig-queue");
if (!fs.existsSync(dir)) { console.log("no ig-queue directory — nothing to do"); process.exit(0); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
if (!files.length) { console.log("no queues staged"); process.exit(0); }

const now = new Date();
let posted = 0, failed = 0, due = 0, retrying = 0, stale = 0;

for (const file of files) {
  const p = path.join(dir, file);
  const q = JSON.parse(fs.readFileSync(p, "utf8"));

  if (!q.approved && !forceId) continue; // never post an unapproved queue

  for (const post of q.posts) {
    const isForced = forceId && post.id === forceId;
    if (post.status !== "pending") continue;
    if (!isForced && new Date(post.postAt) > now) continue;
    due++;

    // A dated post whose event has started is dropped, not published late. An undated
    // one (feature, promo pair, undated news) always goes out — late is fine for those.
    const lateBy = now - new Date(post.postAt).getTime();
    if (!isForced && post.dated && lateBy > STALE_AFTER_MS) {
      post.status = "stale";
      post.error = `slot missed by ${Math.round(lateBy / 3600000)}h — dated item, dropped rather than posted late`;
      stale++;
      console.warn(`⊘ STALE ${q.slug}/${post.id}: ${post.error}`);
      alerts.push(`${q.slug}/${post.id} — dropped, ${Math.round(lateBy / 3600000)}h late (dated)`);
      fs.writeFileSync(p, JSON.stringify(q, null, 2) + "\n");
      continue;
    }

    if (dryRun) {
      console.log(`WOULD POST [${q.slug}/${post.id}] scheduled ${post.postAt}`);
      if (post.slides?.length) console.log(`  carousel, ${post.slides.length} slides:\n${post.slides.map((u) => "    " + u).join("\n")}`);
      else console.log(`  image: ${post.imageUrl}`);
      console.log(`  tags:  ${post.tags.join(" ") || "(none)"}`);
      if (post.userTags?.length) console.log(`  user_tags: ${post.userTags.map((t) => "@" + t.username).join(" ")}${post.abGroup ? `  [A/B: ${post.abGroup}]` : ""}`);
      else if (post.abGroup) console.log(`  user_tags: (none)  [A/B: ${post.abGroup}]`);
      console.log(post.caption.split("\n").map((l) => "    " + l).join("\n"));
      continue;
    }

    if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
      console.error("IG_USER_ID / IG_ACCESS_TOKEN not set — cannot post. (Queue left pending.)");
      process.exit(1);
    }

    try {
      // Container(s), wait, publish — one image or a carousel. See ig-container.mjs.
      const published = await publishPost(post, { graph: GRAPH, userId: IG_USER_ID, token: IG_ACCESS_TOKEN });

      post.status = "posted";
      post.igMediaId = published.id;
      post.postedAt = new Date().toISOString();
      posted++;
      console.log(`✓ posted ${q.slug}/${post.id} → ${published.id}`);
    } catch (err) {
      post.attempts = (post.attempts ?? 0) + 1;
      post.error = String(err.message ?? err).slice(0, 400);
      post.lastAttemptAt = new Date().toISOString();
      // A carousel that has failed twice goes out as the plain card it replaced, so
      // the episode is still announced. The remaining attempts are spent on that.
      const plain = post.attempts >= CAROUSEL_TRIES ? downgradeCarousel(post) : null;
      if (plain) {
        console.warn(`↓ ${q.slug}/${post.id}: carousel failed ${post.attempts}× — falling back to the single card`);
        for (const k of Object.keys(post)) delete post[k];
        Object.assign(post, plain);
      }
      if (post.attempts < MAX_ATTEMPTS) {
        // Stay pending. The 15-minute cron is the backoff — retries cost nothing.
        post.status = "pending";
        retrying++;
        console.warn(`↻ RETRY ${q.slug}/${post.id} (attempt ${post.attempts}/${MAX_ATTEMPTS}): ${post.error}`);
      } else {
        post.status = "failed";
        failed++;
        console.error(`✗ FAILED ${q.slug}/${post.id} after ${post.attempts} attempts: ${post.error}`);
        alerts.push(`${q.slug}/${post.id} — ${post.error}`);
      }
    }
    fs.writeFileSync(p, JSON.stringify(q, null, 2) + "\n");
  }
}

console.log(dryRun
  ? `dry run — ${due} post(s) due now`
  : `done — ${posted} posted, ${retrying} retrying, ${stale} stale, ${failed} failed, ${due} due`);

// Anything that is permanently gone gets shouted about. Retries are silent on purpose:
// the common case is a transient that clears on the next tick, and an alert per tick
// would train the channel to be ignored — which is how we got here.
if (alerts.length && !dryRun) {
  const { notify } = await import("./notify.mjs");
  const subject = `Instagram: ${alerts.length} post(s) did not go out`;
  const body = [
    ...alerts,
    "",
    `Retried ${MAX_ATTEMPTS}× over ~1h before giving up.`,
    "Requeue one with:  node scripts/ig-post.mjs --force=<id>",
    "Log: /home/andy/logs/ig-post.log",
  ].join("\n");
  const { results, delivered } = await notify(subject, body);
  for (const r of results) console.log(`  alert ${r.channel}: ${r.sent ? "sent" : r.skipped ? `skipped (${r.skipped})` : `FAILED ${r.error}`}`);
  if (!delivered) console.error("  ⚠ alert reached NO channel — the failure above is unreported");
}

// Publishing desk: this cron tick is the desk's heartbeat — every 15 minutes the
// week is re-read from the files, so a post that just went out ticks its own box.
if (!dryRun) {
  const { syncQuietly } = await import("./pub-status-store.mjs");
  await syncQuietly();
}

if (failed > 0) process.exit(1);
