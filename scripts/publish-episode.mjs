#!/usr/bin/env node
// Publish an episode end to end, so no channel gets forgotten.
//
// Publishing used to be three separate things done from memory — promote the draft,
// build and queue the Instagram drip, send the newsletter — and whichever one you
// forgot simply didn't happen. This runs the whole sequence in the right order, with
// the outward steps gated behind explicit flags.
//
//   node scripts/publish-episode.mjs                     → site + Instagram + newsletter PREVIEW
//   node scripts/publish-episode.mjs --newsletter send   → ...and the real send
//   node scripts/publish-episode.mjs --site              → just promote + deploy
//   node scripts/publish-episode.mjs --instagram         → just build/deploy/queue the drip
//   node scripts/publish-episode.mjs --status            → report what's done, change nothing
//   --slug YYYY-MM-DD   target a specific episode (default: newest draft, else newest episode)
//   --dry-run           print every command without running it
//
// Run from the repo root on the local machine: it commits and pushes here, then does
// the deploy, queue and mail steps over ssh on the VPS.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VPS = process.env.EAR_VPS || "andy@143.244.188.235";
const REMOTE = "/var/www/soknoear";
const SITE = "https://soknoear.com";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : null; };

const DRY = has("--dry-run");
const STATUS_ONLY = has("--status");
const newsletterMode = val("--newsletter") ?? "preview";
if (!["preview", "send", "skip"].includes(newsletterMode)) {
  console.error(`--newsletter must be preview|send|skip (got ${newsletterMode})`);
  process.exit(1);
}
// With no channel flags, do all three (newsletter defaults to the safe preview).
const explicit = has("--site") || has("--instagram") || has("--newsletter");
const doSite = !explicit || has("--site");
const doIg = !explicit || has("--instagram");
const doMail = (!explicit || has("--newsletter")) && newsletterMode !== "skip";

const DRAFTS = path.join(process.cwd(), "content", "drafts");
const EPISODES = path.join(process.cwd(), "content", "episodes");
const newest = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().at(-1)?.replace(".json", "") ?? null : null;

const slug = val("--slug") ?? newest(DRAFTS) ?? newest(EPISODES);
if (!slug) { console.error("no episode found in content/drafts or content/episodes"); process.exit(1); }

const isDraft = fs.existsSync(path.join(DRAFTS, `${slug}.json`));
const isPublished = fs.existsSync(path.join(EPISODES, `${slug}.json`));
if (!isDraft && !isPublished) { console.error(`no episode ${slug} in drafts or episodes`); process.exit(1); }

const step = (msg) => console.log(`\n━━ ${msg}`);
function run(cmd, args, opts = {}) {
  const shown = `${cmd} ${args.join(" ")}`;
  if (DRY) { console.log(`  [dry-run] ${shown}`); return ""; }
  console.log(`  $ ${shown}`);
  return execFileSync(cmd, args, { encoding: "utf8", stdio: opts.capture ? "pipe" : "inherit", ...opts });
}
const ssh = (remoteCmd, opts) => run("ssh", ["-o", "ConnectTimeout=20", VPS, remoteCmd], opts);

// ── Status ──────────────────────────────────────────────────────────────────
const igDir = path.join(process.cwd(), "public", "assets", "ig", slug);
const igAssets = fs.existsSync(igDir) ? fs.readdirSync(igDir).filter((f) => f.endsWith(".jpg")).length : 0;
let queueState = "not staged";
try {
  const raw = ssh(`cat ${REMOTE}/content/ig-queue/${slug}.json 2>/dev/null || true`, { capture: true, stdio: "pipe" });
  if (raw && raw.trim()) {
    const q = JSON.parse(raw);
    const posted = q.posts.filter((p) => p.status === "posted").length;
    queueState = `${q.approved ? "APPROVED" : "staged, NOT approved"} · ${q.posts.length} posts · ${posted} already out`;
  }
} catch { queueState = "unreadable"; }

console.log(`episode:    ${slug}  (${isDraft ? "DRAFT" : "published"})`);
console.log(`ig assets:  ${igAssets ? `${igAssets} images in public/assets/ig/${slug}` : "MISSING — none built"}`);
console.log(`ig queue:   ${queueState}`);
if (STATUS_ONLY) process.exit(0);
console.log(`plan:       site=${doSite} instagram=${doIg} newsletter=${doMail ? newsletterMode : "skip"}${DRY ? "  (dry run)" : ""}`);

// ── 1. Promote the draft ────────────────────────────────────────────────────
if (doSite && isDraft) {
  step(`Promoting ${slug} out of drafts`);
  run("git", ["mv", `content/drafts/${slug}.json`, `content/episodes/${slug}.json`]);
} else if (doSite) {
  step(`${slug} is already published — nothing to promote`);
}

// ── 2. Instagram artwork (before deploy: Instagram fetches by public URL) ────
if (doIg) {
  step("Building Instagram artwork");
  run("python3", ["scripts/ig-banners.py", slug]);
  run("python3", ["scripts/ig-promos.py", slug]);
}

// ── 3. Commit + push whatever changed ───────────────────────────────────────
step("Committing");
const dirty = DRY ? "dry" : run("git", ["status", "--porcelain"], { capture: true, stdio: "pipe" }).trim();
if (dirty) {
  run("git", ["add", "-A", "content", "public/assets/ig"]);
  run("git", ["commit", "-m", `publish ${slug}${doIg ? " + Instagram assets" : ""}`]);
  run("git", ["push", "origin", "main"]);
} else {
  console.log("  nothing to commit");
}

// ── 4. Deploy ───────────────────────────────────────────────────────────────
step("Deploying");
ssh(`bash ${REMOTE}/scripts/redeploy.sh`);

// ── 5. Queue + approve the Instagram drip ───────────────────────────────────
if (doIg) {
  step("Staging the Instagram drip");
  ssh(`cd ${REMOTE} && set -a; . ./.env; set +a; node scripts/ig-queue.mjs ${slug}`);
  step("Approving it (standing approval)");
  ssh(`cd ${REMOTE} && node scripts/ig-approve.mjs ${slug}`);
}

// ── 6. Newsletter ───────────────────────────────────────────────────────────
if (doMail) {
  step(`Newsletter — ${newsletterMode}`);
  ssh(`cd ${REMOTE} && set -a; . ./.env; set +a; node scripts/notify-subscribers.mjs ${newsletterMode} --slug ${slug}`);
}

console.log(`\n✓ ${slug} done — ${SITE}`);
if (doMail && newsletterMode === "preview") {
  console.log("  newsletter was a PREVIEW (Andy only). Real send:");
  console.log(`  node scripts/publish-episode.mjs --slug ${slug} --newsletter send`);
}
