// Notify subscribers that a new issue of The Ear is up.
//   node scripts/notify-subscribers.mjs preview   → sends only to PREVIEW_TO (Andy)
//   node scripts/notify-subscribers.mjs send       → sends to every real subscriber
// Run from /var/www/soknoear with RESEND_API_KEY in env (set -a; . ./.env.local; set +a).
import { Resend } from "resend";
import Database from "better-sqlite3";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.SUBMIT_FROM || "The SoKno Ear <ear@send.note15.com>";
const REPLY_TO = process.env.SUBMIT_TO || "andy@note15.com";
const PREVIEW_TO = "andy@note15.com";
const HOME = "https://soknoear.com";
const EXCLUDE = new Set(["test@note15.com"]); // obvious test rows

const SUBJECT = "This weekend's Ear is up — the World Cup hits SoKno";

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
  <tr><td style="padding:2px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#171512;">A fresh issue of <strong>The South Knoxville Ear</strong> is up, and this one's a good time.</td></tr>
  <tr><td align="center" style="padding:8px 24px;">
    <a href="${HOME}" target="_blank"><img src="${HOME}/assets/spots/wc_watch.jpg" alt="The World Cup comes to South Knoxville's screens" width="512" style="display:block;width:100%;max-width:512px;height:auto;border:2px solid #171512;border-radius:8px;"></a>
  </td></tr>
  <tr><td style="padding:10px 24px 4px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#171512;">The <strong>World Cup</strong> takes over the neighborhood this weekend — Kern's Bakery has every match on the big outdoor screen. Plus Matt Woods on the Trailhead patio, the Old Sevier Summer Soirée Market, an evening paddle at Ijams Park, eight comics at the Pink Cactus, and Hi-Wire's busy weekend.</td></tr>
  <tr><td align="center" style="padding:18px 24px 6px;">
    <a href="${HOME}" target="_blank" style="display:inline-block;background:#A94A34;color:#F3E8D2;text-decoration:none;font-family:Georgia,serif;font-weight:bold;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;padding:13px 28px;border-radius:6px;">★ Read this weekend's Ear</a>
  </td></tr>
  <tr><td align="center" style="padding:4px 24px 18px;font-family:Georgia,serif;font-size:14px;color:#171512;">or head to <a href="${HOME}" target="_blank" style="color:#A94A34;font-weight:bold;">soknoear.com</a></td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:1px solid #c9b896;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:14px 24px 20px;font-family:Georgia,serif;font-size:12px;line-height:1.5;color:#7a7060;">You're getting this because you signed up for The South Knoxville Ear at soknoear.com. Not for you? Just reply and I'll take you off the list. — Andy</td></tr>
</table></td></tr></table></body></html>`;

const TEXT = `Hey neighbor —

A fresh issue of The South Knoxville Ear is up, and this one's a good time.

The World Cup takes over the neighborhood this weekend — Kern's Bakery has every match on the big outdoor screen. Plus Matt Woods on the Trailhead patio, the Old Sevier Summer Soirée Market, an evening paddle at Ijams Park, eight comics at the Pink Cactus, and Hi-Wire's busy weekend.

Read this weekend's Ear: ${HOME}

You're getting this because you signed up at soknoear.com. Not for you? Just reply and I'll take you off the list. — Andy`;

const mode = process.argv[2];
if (mode !== "preview" && mode !== "send") {
  console.error("usage: node scripts/notify-subscribers.mjs <preview|send>");
  process.exit(1);
}

let recipients;
if (mode === "preview") {
  recipients = [PREVIEW_TO];
} else {
  const db = new Database(process.env.SQLITE_PATH || "/var/lib/soknoear/ear.db", { readonly: true });
  recipients = db.prepare("SELECT email FROM subscribers").all()
    .map((r) => r.email).filter((e) => !EXCLUDE.has(e));
}

console.log(`mode=${mode} → ${recipients.length} recipient(s):`, recipients.join(", "));
for (const to of recipients) {
  const { data, error } = await resend.emails.send({
    from: FROM, to, replyTo: REPLY_TO, subject: SUBJECT, html: HTML, text: TEXT,
  });
  console.log(`  ${to}: ${error ? "ERROR " + JSON.stringify(error) : "sent " + (data?.id ?? "")}`);
}
