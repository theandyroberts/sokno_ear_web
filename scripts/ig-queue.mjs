// Build the week's Instagram drip queue from the published edition.
//   node scripts/ig-queue.mjs            → build queue for the latest edition, print for review
//   node scripts/ig-queue.mjs <slug>     → build for a specific edition
//   node scripts/ig-queue.mjs --json     → machine-readable only
//
// One post per story, scheduled on the day the thing actually happens (stories
// carry `days` already). The feature and any undated news post on publish day.
// Nothing is sent from here — this only stages. Approve with ig-approve.mjs.
process.env.TZ = "America/New_York"; // all slot math is SoKno-local
import fs from "node:fs";
import path from "node:path";

const SITE = "https://soknoear.com";
const BASE_HASHTAGS = "#SoKno #SouthKnoxville #Knoxville #SouthKnoxvilleEar";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_HOUR = 9;

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const slugArg = args.find((a) => !a.startsWith("--"));

const editionsDir = path.join(process.cwd(), "content", "editions");
const slug = slugArg || fs.readdirSync(editionsDir).filter((f) => f.endsWith(".json")).sort().at(-1).replace(".json", "");
const edition = JSON.parse(fs.readFileSync(path.join(editionsDir, `${slug}.json`), "utf8"));

const handlesPath = path.join(process.cwd(), "content", "ig-handles.json");
const registry = fs.existsSync(handlesPath) ? JSON.parse(fs.readFileSync(handlesPath, "utf8")) : { handles: {} };

/** Map a day abbreviation ("Fri") to the real date inside this edition's week. */
function dateForDay(editionDate, dayAbbr) {
  const start = new Date(`${editionDate}T12:00:00-04:00`);
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
  lines.push("", "Full story in this week's Ear → soknoear.com");
  if (tags.length) lines.push("", tags.join(" "));
  lines.push("", BASE_HASHTAGS);
  return lines.join("\n");
}

/**
 * When to post so the reader can still act on it. Aim ~3h ahead of the doors.
 * A morning event is useless to promote that morning, so it gets a heads-up the
 * evening before instead. Collisions shift an hour later.
 */
function slotFor(story, dayDate, taken) {
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
  while (taken.has(`${date.toDateString()}#${hour}`)) hour += 1;
  taken.add(`${date.toDateString()}#${hour}`);
  return { date, hour };
}

const stories = [{ ...edition.feature, __isFeature: true }, ...edition.stories];
const taken = new Set();
const posts = [];
const warnings = [];

for (const s of stories) {
  if (!s.image) continue;
  if (s.social?.igSkip) continue;

  // Feature + undated news announce on publish day; dated items post around their event.
  const firstDay = s.days?.[0];
  const dated = !s.__isFeature && firstDay;
  const dayDate = dated
    ? dateForDay(edition.date, firstDay)
    : (() => { const d = new Date(`${edition.date}T12:00:00-04:00`); d.setDate(d.getDate() - 1); return d; })();

  const { date, hour } = dated
    ? slotFor(s, dayDate, taken)
    : slotFor({ ...s, event: undefined }, dayDate, taken);

  const { tags, unknown } = resolveTags(s);
  if (unknown.length) warnings.push(`${s.id}: no verified handle for ${unknown.join(", ")} — tag dropped`);
  if (!s.social?.igTags?.length) warnings.push(`${s.id}: no igTags set — posting untagged`);

  // Prefer the titled banner version (scripts/ig-banners.py) when it exists.
  const bannerRel = `/assets/ig/${edition.slug}/${s.id}.jpg`;
  const hasBanner = fs.existsSync(path.join(process.cwd(), "public", bannerRel));

  posts.push({
    id: s.id,
    title: s.title,
    postAt: iso(date, hour),
    imageUrl: `${SITE}${hasBanner ? bannerRel : s.image}`,
    permalink: `${SITE}/${edition.slug}/${s.id}`,
    caption: buildCaption(s, tags),
    tags,
    status: "pending",
  });
}

posts.sort((a, b) => a.postAt.localeCompare(b.postAt));

const queue = {
  slug: edition.slug,
  edition: `Vol. ${edition.volume} — No. ${edition.number}`,
  approved: false,
  posts,
};

const outDir = path.join(process.cwd(), "content", "ig-queue");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${edition.slug}.json`);
fs.writeFileSync(outPath, JSON.stringify(queue, null, 2) + "\n");

if (jsonOnly) {
  console.log(JSON.stringify(queue, null, 2));
} else {
  console.log(`\n★ Instagram queue — ${queue.edition} (${posts.length} posts)`);
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
  console.log(`\nApprove with:  node scripts/ig-approve.mjs ${edition.slug}\n`);
}
