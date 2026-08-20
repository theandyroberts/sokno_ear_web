// Notify subscribers that a fresh episode of The Ear is up.
//   node scripts/notify-subscribers.mjs preview            → sends only to PREVIEW_TO (Andy)
//   node scripts/notify-subscribers.mjs send               → sends to every real subscriber (+ recap)
//   node scripts/notify-subscribers.mjs send-one <email>   → sends to one late signup (no recap)
// Add --slug <YYYY-MM-DD> to target an episode other than the newest.
// Run from /var/www/soknoear with RESEND_API_KEY in env (set -a; . ./.env; set +a).
//
// The email is BUILT FROM THE EPISODE JSON (scripts/newsletter-template.mjs). There is
// no per-week copy in this file — publishing a new episode is all that's needed.
import { Resend } from "resend";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { buildNewsletter } from "./newsletter-template.mjs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.SUBMIT_FROM || "The SoKno Ear <ear@updates.note15.com>";
const REPLY_TO = process.env.SUBMIT_TO || "andy@note15.com";
const PREVIEW_TO = "andy@note15.com";
const HOME = "https://soknoear.com";
const EXCLUDE = new Set(["test@note15.com"]); // obvious test rows

const mode = process.argv[2];
if (mode !== "preview" && mode !== "send" && mode !== "send-one") {
  console.error("usage: node scripts/notify-subscribers.mjs <preview|send|send-one <email>> [--slug YYYY-MM-DD]");
  process.exit(1);
}

// ── Load the episode and build the email from it ────────────────────────────
const EPISODES_DIR = path.join(process.cwd(), "content", "episodes");
const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i > -1 ? process.argv[i + 1] : null;
})();

let episode;
try {
  const file = slugArg
    ? `${slugArg}.json`
    : fs.readdirSync(EPISODES_DIR).filter((f) => f.endsWith(".json")).sort().at(-1);
  if (!file) throw new Error(`no episodes in ${EPISODES_DIR}`);
  episode = JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, file), "utf8"));
} catch (e) {
  console.error(`could not load episode: ${e.message}`);
  console.error("run this from the site root (/var/www/soknoear) so content/episodes resolves");
  process.exit(1);
}

const { subject: SUBJECT, html: HTML, text: TEXT, hero, warnings } = buildNewsletter(episode, {
  home: HOME,
  fileExists: (rel) => fs.existsSync(path.join(process.cwd(), "public", rel)),
});

for (const w of warnings) console.warn(`  ! ${w}`);
console.log(`episode: Vol. ${episode.volume} No. ${episode.number} · ${episode.slug} (${episode.dateLabel ?? episode.date})`);
console.log(`subject: ${SUBJECT}`);
console.log(`hero:    ${hero ?? "(none)"}`);

let recipients;
if (mode === "preview") {
  recipients = [PREVIEW_TO];
} else if (mode === "send-one") {
  const one = (process.argv[3] ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(one)) {
    console.error("send-one requires a valid email argument");
    process.exit(1);
  }
  recipients = [one];
} else {
  const db = new Database(process.env.SQLITE_PATH || "/var/lib/soknoear/ear.db", { readonly: true });
  // The weekly episode email goes to the 'ear' list only — 'dsparty' members
  // signed up for party-page notices, not this. (Falls back to the old
  // whole-table read if the lists table hasn't been created yet.)
  let subs;
  try {
    subs = db.prepare("SELECT email FROM subscriber_lists WHERE list = 'ear'").all()
      .map((r) => r.email).filter((e) => !EXCLUDE.has(e));
  } catch {
    subs = db.prepare("SELECT email FROM subscribers").all()
      .map((r) => r.email).filter((e) => !EXCLUDE.has(e));
  }
  recipients = [...new Set([...subs, "andy@note15.com"])]; // subscribers + copy Andy
}

console.log(`mode=${mode} → ${recipients.length} recipient(s):`, recipients.join(", "));
const results = [];
for (const to of recipients) {
  const { data, error } = await resend.emails.send({
    from: FROM, to, replyTo: REPLY_TO, subject: SUBJECT, html: HTML, text: TEXT,
  });
  results.push({ to, ok: !error, id: data?.id ?? "", error: error ? JSON.stringify(error) : "" });
  console.log(`  ${to}: ${error ? "ERROR " + results.at(-1).error : "sent " + results.at(-1).id}`);
}

// ── Publish-run recap to the city desk (send mode only) ─────────────────────
if (mode === "send") {
  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const storyLines = [episode.feature, ...episode.stories].map(
    (s, i) => `  ${i === 0 ? "★" : "·"} ${s.title}${s.days?.length ? ` (${s.days.join("/")})` : ""}`);
  const recap = [
    `Vol. ${episode.volume} — No. ${episode.number} · ${episode.dateLabel ?? episode.date} is live at ${HOME}`,
    "",
    "IN THIS EPISODE",
    ...storyLines,
    episode.sidebar?.audio ? `  ♫ Audio briefing · ${episode.sidebar.audio.duration}` : "",
    "",
    "SUBSCRIBER NOTICES",
    `  Sent: ${sent.length} of ${results.length}`,
    ...sent.map((r) => `  ✓ ${r.to}`),
    ...failed.map((r) => `  ✗ ${r.to} — ${r.error}`),
    "",
    `Subject line: ${SUBJECT}`,
  ].filter((l) => l !== "").join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to: REPLY_TO,
    subject: `Publish recap — Vol. ${episode.volume} No. ${episode.number} (${episode.shortDate ?? episode.date}) · ${sent.length}/${results.length} notices sent`,
    text: recap,
  });
  console.log(error ? `recap: ERROR ${JSON.stringify(error)}` : "recap: sent to " + REPLY_TO);
}
