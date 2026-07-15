// Post any DUE + APPROVED items from the Instagram queue. Intended for cron on the VPS.
//   node scripts/ig-post.mjs --dry-run     → show what would post right now, send nothing
//   node scripts/ig-post.mjs               → post due items
//   node scripts/ig-post.mjs --force=<id>  → post one item now regardless of schedule
//
// Requires in .env:  IG_USER_ID=<numeric ig business account id>
//                    IG_ACCESS_TOKEN=<long-lived token, refresh every ~60 days>
//
// Meta fetches the image FROM A PUBLIC URL (it will not accept bytes), which is why
// every engraving already living at soknoear.com/assets/... is the whole ballgame.
// Two-step publish: create a media container, then publish it.
import fs from "node:fs";
import path from "node:path";

const GRAPH = "https://graph.facebook.com/v21.0";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceId = args.find((a) => a.startsWith("--force="))?.split("=")[1];

const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;

const dir = path.join(process.cwd(), "content", "ig-queue");
if (!fs.existsSync(dir)) { console.log("no ig-queue directory — nothing to do"); process.exit(0); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
if (!files.length) { console.log("no queues staged"); process.exit(0); }

const now = new Date();
let posted = 0, failed = 0, due = 0;

for (const file of files) {
  const p = path.join(dir, file);
  const q = JSON.parse(fs.readFileSync(p, "utf8"));

  if (!q.approved && !forceId) continue; // never post an unapproved queue

  for (const post of q.posts) {
    const isForced = forceId && post.id === forceId;
    if (post.status !== "pending") continue;
    if (!isForced && new Date(post.postAt) > now) continue;
    due++;

    if (dryRun) {
      console.log(`WOULD POST [${q.slug}/${post.id}] scheduled ${post.postAt}`);
      console.log(`  image: ${post.imageUrl}`);
      console.log(`  tags:  ${post.tags.join(" ") || "(none)"}`);
      console.log(post.caption.split("\n").map((l) => "    " + l).join("\n"));
      continue;
    }

    if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
      console.error("IG_USER_ID / IG_ACCESS_TOKEN not set — cannot post. (Queue left pending.)");
      process.exit(1);
    }

    try {
      // 1. container
      const createRes = await fetch(`${GRAPH}/${IG_USER_ID}/media`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image_url: post.imageUrl,
          caption: post.caption,
          access_token: IG_ACCESS_TOKEN,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok || !created.id) throw new Error(`container: ${JSON.stringify(created).slice(0, 300)}`);

      // 2. publish
      const pubRes = await fetch(`${GRAPH}/${IG_USER_ID}/media_publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creation_id: created.id, access_token: IG_ACCESS_TOKEN }),
      });
      const published = await pubRes.json();
      if (!pubRes.ok || !published.id) throw new Error(`publish: ${JSON.stringify(published).slice(0, 300)}`);

      post.status = "posted";
      post.igMediaId = published.id;
      post.postedAt = new Date().toISOString();
      posted++;
      console.log(`✓ posted ${q.slug}/${post.id} → ${published.id}`);
    } catch (err) {
      post.status = "failed";
      post.error = String(err.message ?? err).slice(0, 400);
      failed++;
      console.error(`✗ FAILED ${q.slug}/${post.id}: ${post.error}`);
    }
    fs.writeFileSync(p, JSON.stringify(q, null, 2) + "\n");
  }
}

console.log(dryRun
  ? `dry run — ${due} post(s) due now`
  : `done — ${posted} posted, ${failed} failed, ${due} due`);
if (failed > 0) process.exit(1);
