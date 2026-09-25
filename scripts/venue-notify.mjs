// Tell every venue in an episode that it's in the Ear. Runs on the VPS at publish.
//
//   node scripts/venue-notify.mjs [--slug YYYY-MM-DD]   → plan only; writes drafts, sends nothing
//   node scripts/venue-notify.mjs preview               → every note goes to PREVIEW_TO (Andy) only
//   node scripts/venue-notify.mjs send                  → send to introduced venues; drafts for the rest
//
// Who gets what is decided in venue-notify-lib.mjs. In short: a venue with an
// `introduced` date in content/contacts.json gets the weekly note automatically;
// one without gets a first-contact draft written to content/venue-notify/<slug>/
// for Andy to send from his own account. Nothing here ever sends a first contact.
//
// Sends are logged per slug in content/venue-notify/<slug>.json (gitignored, VPS-
// side), so re-running a publish can't mail a venue twice for the same episode.
//
// Andy's rule (2026-09-23): the notes HE sends must be drafts in his own Gmail.
// The VPS can't reach Gmail, so every draft is also written to
// content/venue-notify/<slug>/drafts.json; the "venue-drafts" scheduled task on the
// Mac mini reads that over ssh and creates the Gmail drafts through the connector.
import fs from "node:fs";
import path from "node:path";
import { resolveVenues, planNotifications, renderMessage, upcomingStories, lastEventDay } from "./venue-notify-lib.mjs";

const mode = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "plan";
if (!["plan", "preview", "send"].includes(mode)) {
  console.error("usage: node scripts/venue-notify.mjs [plan|preview|send] [--slug YYYY-MM-DD]");
  process.exit(1);
}
const slugArg = (() => { const i = process.argv.indexOf("--slug"); return i > -1 ? process.argv[i + 1] : null; })();

const FROM = process.env.VENUE_FROM || "Andy Roberts <andy@updates.note15.com>";
const REPLY_TO = process.env.VENUE_REPLY_TO || process.env.SUBMIT_TO || "andy@note15.com";
const PREVIEW_TO = process.env.PREVIEW_TO || "andy@note15.com";

const root = process.cwd();
const episodesDir = path.join(root, "content", "episodes");
const file = slugArg ? `${slugArg}.json` : fs.readdirSync(episodesDir).filter((f) => f.endsWith(".json")).sort().at(-1);
const episode = JSON.parse(fs.readFileSync(path.join(episodesDir, file), "utf8"));
const contacts = JSON.parse(fs.readFileSync(path.join(root, "content", "contacts.json"), "utf8")).contacts;

const outDir = path.join(root, "content", "venue-notify");
fs.mkdirSync(path.join(outDir, episode.slug), { recursive: true });
const logPath = path.join(outDir, `${episode.slug}.json`);
const sentLog = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : {};

const { venues, unresolved } = resolveVenues(episode, contacts);
// A note only earns its keep before the event, so past stories drop out, and a
// venue whose whole week is behind it gets nothing this time.
const past = [];
for (const [k, v] of venues) {
  v.stories = upcomingStories(episode, v.stories);
  if (!v.stories.length) { venues.delete(k); past.push(contacts[k]?.name ?? k); }
}
const plan = planNotifications(venues, contacts, sentLog);

console.log(`venue-notify · ${episode.slug} (No. ${episode.number}) · mode=${mode}`);
console.log(`  ${venues.size} venue(s) referenced · ${plan.filter((p) => p.action === "send").length} to send · ${plan.filter((p) => p.action === "draft").length} first-contact draft(s) · ${plan.filter((p) => p.action === "no-email").length} with no email · ${plan.filter((p) => p.action === "done").length} already sent`);
if (past.length) console.log(`  ⌛ skipped, every event already past: ${past.join(", ")}`);
for (const u of unresolved) console.log(`  ? ${u.id}: "${u.where}" matched no contact — add a match string or a new entry in content/contacts.json`);

let resend = null;
if (mode !== "plan") {
  const { Resend } = await import("resend");
  if (!process.env.RESEND_API_KEY) { console.error("RESEND_API_KEY unset"); process.exit(1); }
  resend = new Resend(process.env.RESEND_API_KEY);
}

const drafts = [];
for (const p of plan) {
  const first = p.action === "draft";
  const msg = renderMessage({ episode, name: p.name, contact: p.contact, stories: p.stories, first });
  const draftPath = path.join(outDir, episode.slug, `${p.key}${first ? ".FIRST-CONTACT" : ""}.txt`);
  fs.writeFileSync(draftPath, `To: ${p.to ?? "(no email on file — DM " + (p.contact.instagram ?? "?") + ")"}\nSubject: ${msg.subject}\n\n${msg.text}\n`);

  const label = `${p.name.padEnd(28)} ${p.stories.length} stor${p.stories.length === 1 ? "y" : "ies"}`;
  if (p.action === "done") { console.log(`  = ${label} · already sent`); continue; }
  if (p.action === "draft") { console.log(`  ✎ ${label} · FIRST CONTACT — draft for Andy → ${path.relative(root, draftPath)}`); drafts.push({ ...p, msg }); continue; }
  if (p.action === "no-email") { console.log(`  ! ${label} · introduced but no email on file — draft written, DM ${p.contact.instagram ?? "?"}`); drafts.push({ ...p, msg }); continue; }

  if (mode === "plan") { console.log(`  → ${label} · would send to ${p.to}`); continue; }
  const to = mode === "preview" ? PREVIEW_TO : p.to;
  try {
    const r = await resend.emails.send({ from: FROM, to, replyTo: REPLY_TO, subject: mode === "preview" ? `[preview → ${p.to}] ${msg.subject}` : msg.subject, text: msg.text, html: msg.html });
    if (r.error) throw new Error(r.error.message ?? JSON.stringify(r.error));
    console.log(`  ✓ ${label} · sent to ${to}${mode === "preview" ? " (preview)" : ""}`);
    if (mode === "send") { sentLog[p.key] = { to, at: new Date().toISOString(), id: r.data?.id ?? null }; fs.writeFileSync(logPath, JSON.stringify(sentLog, null, 2) + "\n"); }
  } catch (e) {
    console.error(`  ✗ ${label} · FAILED — ${e.message}`);
  }
}

// Machine-readable copy for the Gmail-drafts task (every mode, so a plan run is a preview of it).
const draftsPath = path.join(outDir, episode.slug, "drafts.json");
const prior = fs.existsSync(draftsPath) ? JSON.parse(fs.readFileSync(draftsPath, "utf8")) : {};
for (const d of drafts) {
  prior[d.key] = {
    ...(prior[d.key] ?? {}),
    key: d.key, name: d.name, action: d.action, to: d.to, instagram: d.contact.instagram ?? null,
    contactPage: d.contact.contactPage ?? null, subject: d.msg.subject, text: d.msg.text, html: d.msg.html,
    stories: d.stories.map((s) => s.id), writtenAt: new Date().toISOString(),
    // The Gmail-drafts task makes no draft once this day has passed.
    lastDay: d.stories.map((s) => lastEventDay(episode, s)).sort().at(-1),
  };
}
fs.writeFileSync(draftsPath, JSON.stringify(prior, null, 2) + "\n");
if (drafts.length) console.log(`  ⇢ ${drafts.length} draft(s) written to ${path.relative(root, draftsPath)} for the Gmail-drafts task`);
