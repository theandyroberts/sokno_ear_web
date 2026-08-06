// Notify subscribers that a new issue of The Ear is up.
//   node scripts/notify-subscribers.mjs preview            → sends only to PREVIEW_TO (Andy)
//   node scripts/notify-subscribers.mjs send               → sends to every real subscriber (+ recap)
//   node scripts/notify-subscribers.mjs send-one <email>   → sends to one late signup (no recap)
// Run from /var/www/soknoear with RESEND_API_KEY in env (set -a; . ./.env; set +a).
import { Resend } from "resend";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.SUBMIT_FROM || "The SoKno Ear <ear@updates.note15.com>";
const REPLY_TO = process.env.SUBMIT_TO || "andy@note15.com";
const PREVIEW_TO = "andy@note15.com";
const HOME = "https://soknoear.com";
const EXCLUDE = new Set(["test@note15.com"]); // obvious test rows

const SUBJECT = "The final bow — Shakespeare's last four nights, a ho'down, and dog bingo";

const HTML = `<!doctype html><html><body style="margin:0;padding:0;background:#e9dcc4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9dcc4;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#F3E8D2;border:1px solid #171512;">
  <tr><td align="center" style="padding:22px 24px 8px;">
    <a href="${HOME}" target="_blank" style="text-decoration:none;color:#171512;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:bold;letter-spacing:0.02em;text-transform:uppercase;color:#171512;">★ The South Knoxville Ear ★</div>
      <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#A94A34;margin-top:5px;">South Knoxville Events &amp; Rumors</div>
    </a>
  </td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:2px solid #171512;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:18px 24px 2px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;color:#171512;">Hey neighbor —</td></tr>
  <tr><td style="padding:2px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#171512;">A fresh episode of <strong>The South Knoxville Ear</strong> is up, and this one's a good time.</td></tr>
  <tr><td align="center" style="padding:8px 24px;">
    <a href="${HOME}" target="_blank"><img src="${HOME}/assets/spots/shakespeare_finale.jpg" alt="The final bow at Ijams Park" width="512" style="display:block;width:100%;max-width:512px;height:auto;border:2px solid #171512;border-radius:8px;"></a>
  </td></tr>
  <tr><td style="padding:10px 24px 4px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#171512;">This weekend the neighborhood says a proper goodbye: <strong>the 36th Knoxville Shakespeare festival plays its final four nights at Ijams Park</strong> — Thursday's Henry V is pay-what-you-can, and Sunday night Merry Wives takes the festival's last bow. Also inside: <strong>Thursday is Election Day</strong> (polls 8–8); the Ho'down Social at Kern's is now every other Friday, with The Band covered live before the dancing; a sound bath, stained glass, and yoga make Sunday at Ijams Park the softest morning of the year; Earl's runs a different margarita deal every day; and Alliance hosts Bow Wow Bingo Sunday — beer and bingo, for the dogs.</td></tr>
  <tr><td align="center" style="padding:18px 24px 6px;">
    <a href="${HOME}" target="_blank" style="display:inline-block;background:#A94A34;color:#F3E8D2;text-decoration:none;font-family:Georgia,serif;font-weight:bold;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;padding:13px 28px;border-radius:6px;">★ Read this weekend's Ear</a>
  </td></tr>
  <tr><td align="center" style="padding:4px 24px 18px;font-family:Georgia,serif;font-size:14px;color:#171512;">or head to <a href="${HOME}" target="_blank" style="color:#A94A34;font-weight:bold;">soknoear.com</a></td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:1px solid #c9b896;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:14px 24px 20px;font-family:Georgia,serif;font-size:12px;line-height:1.5;color:#7a7060;">You're getting this because you signed up for The South Knoxville Ear at soknoear.com. Not for you? Just reply and I'll take you off the list. — Andy</td></tr>
</table></td></tr></table></body></html>`;

const TEXT = `Hey neighbor —

A fresh episode of The South Knoxville Ear is up, and this one's a good time.

This weekend the neighborhood says a proper goodbye: the 36th Knoxville Shakespeare festival plays its final four nights at Ijams Park — Thursday's Henry V is pay-what-you-can, and Sunday night Merry Wives takes the festival's last bow. Also inside: Thursday is Election Day (polls 8–8); the Ho'down Social at Kern's is now every other Friday, with The Band covered live before the dancing; a sound bath, stained glass, and yoga make Sunday at Ijams Park the softest morning of the year; Earl's runs a different margarita deal every day; and Alliance hosts Bow Wow Bingo Sunday — beer and bingo, for the dogs.

Read this weekend's Ear: ${HOME}

You're getting this because you signed up at soknoear.com. Not for you? Just reply and I'll take you off the list. — Andy`;

const mode = process.argv[2];
if (mode !== "preview" && mode !== "send" && mode !== "send-one") {
  console.error("usage: node scripts/notify-subscribers.mjs <preview|send|send-one <email>>");
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
  const subs = db.prepare("SELECT email FROM subscribers").all()
    .map((r) => r.email).filter((e) => !EXCLUDE.has(e));
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
  let episode = null;
  try {
    const dir = path.join(process.cwd(), "content", "episodes");
    const latest = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().at(-1);
    episode = JSON.parse(fs.readFileSync(path.join(dir, latest), "utf8"));
  } catch (e) {
    console.error("recap: could not load latest episode:", e.message);
  }
  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const storyLines = episode
    ? [episode.feature, ...episode.stories].map((s, i) => `  ${i === 0 ? "★" : "·"} ${s.title}${s.days?.length ? ` (${s.days.join("/")})` : ""}`)
    : ["  (episode not readable)"];
  const recap = [
    episode ? `Vol. ${episode.volume} — No. ${episode.number} · ${episode.dateLabel ?? episode.date} is live at https://soknoear.com` : "New issue is live at https://soknoear.com",
    "",
    "IN THIS EPISODE",
    ...storyLines,
    episode?.sidebar?.audio ? `  ♫ Audio briefing · ${episode.sidebar.audio.duration}` : "",
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
    subject: `Publish recap — ${episode ? `Vol. ${episode.volume} No. ${episode.number} (${episode.shortDate ?? episode.date})` : "new issue"} · ${sent.length}/${results.length} notices sent`,
    text: recap,
  });
  console.log(error ? `recap: ERROR ${JSON.stringify(error)}` : "recap: sent to " + REPLY_TO);
}
