// Approve a staged Instagram queue. Nothing posts until this runs.
//   node scripts/ig-approve.mjs <slug>          → approve every pending post
//   node scripts/ig-approve.mjs <slug> --drop=earls-rita,hiwire-sunday
//   node scripts/ig-approve.mjs <slug> --revoke → un-approve (stops the drip)
import fs from "node:fs";
import path from "node:path";

const [slug, ...flags] = process.argv.slice(2);
if (!slug) {
  console.error("usage: node scripts/ig-approve.mjs <slug> [--drop=id,id] [--revoke]");
  process.exit(1);
}
const p = path.join(process.cwd(), "content", "ig-queue", `${slug}.json`);
if (!fs.existsSync(p)) {
  console.error(`no queue staged for ${slug} — run: node scripts/ig-queue.mjs ${slug}`);
  process.exit(1);
}
const q = JSON.parse(fs.readFileSync(p, "utf8"));
const drop = new Set((flags.find((f) => f.startsWith("--drop="))?.split("=")[1] ?? "").split(",").filter(Boolean));

if (flags.includes("--revoke")) {
  q.approved = false;
  fs.writeFileSync(p, JSON.stringify(q, null, 2) + "\n");
  console.log(`✗ ${slug} un-approved — the drip is stopped. Already-posted items are untouched.`);
  process.exit(0);
}

for (const post of q.posts) {
  if (drop.has(post.id)) post.status = "skipped";
}
q.approved = true;
fs.writeFileSync(p, JSON.stringify(q, null, 2) + "\n");

const live = q.posts.filter((x) => x.status === "pending");
console.log(`✓ ${slug} approved — ${live.length} post(s) will go out on schedule:`);
for (const x of live) console.log(`   ${x.postAt.slice(0, 16).replace("T", " ")}  ${x.id}`);
if (drop.size) console.log(`   skipped: ${[...drop].join(", ")}`);
