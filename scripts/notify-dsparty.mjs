// Tell the DSParty list the fresh party page is up.
//   node scripts/notify-dsparty.mjs preview            → sends only to PREVIEW_TO (Andy)
//   node scripts/notify-dsparty.mjs send               → sends to the dsparty list (+ recap)
//   node scripts/notify-dsparty.mjs send-one <email>   → one late signup, no recap
// Run from /var/www/soknoear with RESEND_API_KEY in env (set -a; . ./.env; set +a).
import { Resend } from "resend";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

process.env.TZ = "America/New_York";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.SUBMIT_FROM || "The SoKno Ear <ear@updates.note15.com>";
const REPLY_TO = process.env.SUBMIT_TO || "andy@note15.com";
const PREVIEW_TO = "andy@note15.com";
const EXCLUDE = new Set(["test@note15.com"]);
const GREEN = "#CDE24A";
const INK = "#131309";
const PARTY = "https://soknoear.com/party?src=email-weekly";

// One teaser line per night, pulled from the live lineup.
const nightlife = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "nightlife.json"), "utf8"));

// Refuse to announce a stale plan. The 2026-09-16 publish mailed "Sep 10–13"
// because nightlife.json hadn't been refreshed for the new week — the episode's
// dateLabel ("Thu–Sun, Sep 17–20, 2026") is the source of truth for the window,
// so a weekend label it doesn't contain means the party page is last week's.
// Override (rare, deliberate) with STALE_WEEKEND_OK=1.
{
  const epDir = path.join(process.cwd(), "content", "episodes");
  const latest = fs.readdirSync(epDir).filter((f) => f.endsWith(".json")).sort().at(-1);
  const episode = JSON.parse(fs.readFileSync(path.join(epDir, latest), "utf8"));
  const label = episode.dateLabel ?? "";
  if (!label.includes(nightlife.weekend) && process.env.STALE_WEEKEND_OK !== "1") {
    console.error(`REFUSING TO SEND: nightlife.json says "${nightlife.weekend}" but the live episode is "${label}".`);
    console.error(`Refresh content/nightlife.json for the new week (weekend label + game-day items), deploy, then re-run.`);
    process.exit(1);
  }
}
const DAYS = ["Thu", "Fri", "Sat", "Sun"];

// Ways to finish "…plus 5 more ___". One call-out alone read like it was the only thing
// on that night (Andy, 2026-09-16), so every line now carries the rest of the count.
// Stored as [singular, plural] so "plus 1 more" doesn't come out plural.
const TAILS = [
  ["thing to do", "things to do"],
  ["reason to stay out", "reasons to stay out"],
  ["stop on the crawl", "stops on the crawl"],
  ["room worth walking into", "rooms worth walking into"],
  ["way to spend the night", "ways to spend the night"],
  ["place with something on", "places with something on"],
  ["excuse to stay out", "excuses to stay out"],
  ["door open late", "doors open late"],
  ["reason not to go home", "reasons not to go home"],
  ["good idea", "good ideas"],
  ["option after that", "options after that"],
  ["stop if you're still going", "stops if you're still going"],
  ["plan in the same mile", "plans in the same mile"],
  ["spot on the list", "spots on the list"],
  ["way the night can go", "ways the night can go"],
  ["reason to keep walking", "reasons to keep walking"],
  ["place pouring", "places pouring"],
  ["thing worth the walk", "things worth the walk"],
  ["way to fill the hours", "ways to fill the hours"],
  ["stop before last call", "stops before last call"],
  ["reason to stay south", "reasons to stay south"],
  ["corner worth turning", "corners worth turning"],
  ["thing on the board", "things on the board"],
  ["way to make an evening of it", "ways to make an evening of it"],
  ["place still open", "places still open"],
  ["good call", "good calls"],
  ["turn you could take", "turns you could take"],
  ["reason to stretch it out", "reasons to stretch it out"],
  ["idea in walking distance", "ideas in walking distance"],
  ["room with the lights on", "rooms with the lights on"],
  ["thing happening the same night", "things happening the same night"],
  ["stage, table or barstool", "stages, tables and barstools"],
  ["reason to leave the house", "reasons to leave the house"],
  ["way to lose an evening", "ways to lose an evening"],
  ["nudge in the right direction", "nudges in the right direction"],
  ["place that wants your company", "places that want your company"],
];

// Deterministic per (weekend, day) so a re-send reads the same, but the four lines in
// one email never repeat a tail and the pool rotates week to week.
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const used = new Set();
const tailFor = (day, n) => {
  let i = hash(`${nightlife.weekend}|${day}`) % TAILS.length;
  while (used.has(i)) i = (i + 1) % TAILS.length;
  used.add(i);
  return TAILS[i][n === 1 ? 0 : 1];
};

// Lead each night with the most event-ish thing, best category first. Without the
// venue de-dup three of four nights led with the same karaoke room, which read like
// karaoke was all we had (Andy, 2026-09-16).
const CAT_RANK = ["star", "music", "dance", "mic"];
const seenVenue = new Set();
const teasers = DAYS.map((d) => {
  const items = nightlife.days[d] ?? [];
  if (!items.length) return null;
  const score = (i) => {
    const r = CAT_RANK.indexOf(i.cat);
    return (r === -1 ? CAT_RANK.length : r) * 10 + (seenVenue.has(i.venue) ? 5 : 0);
  };
  const pick = [...items].sort((a, b) => score(a) - score(b) || items.indexOf(a) - items.indexOf(b))[0];
  seenVenue.add(pick.venue);
  const rest = items.length - 1;
  const callout = `${pick.headline} · ${pick.venue.split(" · ")[0]}`;
  const line = rest > 0 ? `${callout}, plus ${rest} more ${tailFor(d, rest)}` : callout;
  return { day: d, line };
}).filter(Boolean);

const SUBJECT = `The Dirty South plan is up — ${nightlife.weekend}`;

const teaserHtml = teasers.map((t) =>
  `<tr><td style="padding:4px 22px;font-family:'Courier New',monospace;font-size:13px;line-height:1.5;color:${INK};"><span style="font-family:'Arial Black',Arial,sans-serif;font-weight:900;">${t.day.toUpperCase()}</span> &mdash; ${t.line}</td></tr>`
).join("\n");

const HTML = `<!doctype html><html><head><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><style>:root{color-scheme:light only;supported-color-schemes:light only;}</style></head><body style="margin:0;padding:0;background:${GREEN};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GREEN};"><tr><td align="center" style="padding:0 0 28px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
  <tr><td style="background:${INK};color:${GREEN};padding:10px 18px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">&#9733; The South Knoxville Ear &mdash; night side</td></tr>
  <tr><td style="padding:28px 22px 4px;font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:38px;line-height:0.95;text-transform:uppercase;color:${INK};">The plan<br>is up.</td></tr>
  <tr><td style="padding:14px 22px 10px;font-family:'Courier New',monospace;font-size:14px;line-height:1.6;color:${INK};">
    Fresh Dirty South party page for ${nightlife.weekend} &mdash; the whole night, in order,
    happy hour to last pour. A taste:
  </td></tr>
  ${teaserHtml}
  <tr><td align="center" style="padding:20px 22px 8px;">
    <a href="${PARTY}" style="display:inline-block;background:${INK};color:${GREEN};text-decoration:none;font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:17px;letter-spacing:0.05em;text-transform:uppercase;padding:14px 26px;">Open the party page &rarr;</a>
  </td></tr>
  <tr><td style="padding:18px 22px 14px;font-family:'Courier New',monospace;font-size:11px;line-height:1.5;color:${INK};">
    You&rsquo;re getting this because you joined the party list at <a href="https://soknoear.com/party" style="color:${INK};">soknoear.com/party</a>.
    Reply and we&rsquo;ll take you off. &mdash; The SoKno Ear
  </td></tr>
  <tr><td style="background:${INK};padding:12px 18px;text-align:center;font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:18px;letter-spacing:0.08em;"><a href="https://soknoear.com" style="color:${GREEN};text-decoration:none;">SOKNOEAR.COM</a></td></tr>
</table></td></tr></table></body></html>`;

const TEXT = `THE PLAN IS UP — Party in the Dirty South, ${nightlife.weekend}

The whole night, in order, happy hour to last pour. A taste:
${teasers.map((t) => `${t.day.toUpperCase()} — ${t.line}`).join("\n")}

Open the party page: ${PARTY}

You're getting this because you joined the party list at soknoear.com/party. Reply and we'll take you off. — The SoKno Ear`;

const mode = process.argv[2];
if (mode !== "preview" && mode !== "send" && mode !== "send-one") {
  console.error("usage: node scripts/notify-dsparty.mjs <preview|send|send-one <email>>");
  process.exit(1);
}

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
  recipients = db.prepare("SELECT email FROM subscriber_lists WHERE list = 'dsparty' ORDER BY created_at").all()
    .map((r) => r.email).filter((e) => !EXCLUDE.has(e));
  if (recipients.length === 0) { console.log("dsparty list is empty (after exclusions) — nothing to send"); process.exit(0); }
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

if (mode === "send") {
  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const recap = [
    `DSParty notice for ${nightlife.weekend} sent.`,
    "",
    `Sent: ${sent.length} of ${results.length}`,
    ...sent.map((r) => `  ✓ ${r.to}`),
    ...failed.map((r) => `  ✗ ${r.to} — ${r.error}`),
    "",
    `Subject line: ${SUBJECT}`,
  ].join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to: REPLY_TO,
    subject: `DSParty recap — ${nightlife.weekend} · ${sent.length}/${results.length} sent`,
    text: recap,
  });
  console.log(error ? `recap: ERROR ${JSON.stringify(error)}` : "recap: sent to " + REPLY_TO);
}
