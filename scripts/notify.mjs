// One place to reach Andy when something needs him. Usage:
//   node scripts/notify.mjs "<subject>" "<text>"
//
// Fans out to every channel that is configured, and says which ones landed.
// Exits non-zero only if NOTHING got through — a half-delivered alert is still
// an alert, and the caller should not treat it as a failure.
//
//   email  — Resend. Needs RESEND_API_KEY. Recipient ALERT_TO → SUBMIT_TO → desk.
//   sms    — AgentPhone, from the Ear's own line. Needs AGENTPHONE_API_KEY and
//            ALERT_SMS_TO (E.164, e.g. +18655551234). Unset = skipped silently.
//
// SMS exists because email is not a real alerting channel here: Andy runs 100+
// unread on a normal day, and the www-redirect finding sat unread for two weeks
// inside a report that was delivered exactly as designed. Set ALERT_SMS_TO on the
// VPS and the loud things get loud. See docs/OPEN-ITEMS.md.
import { Resend } from "resend";

const AGENTPHONE_BASE = process.env.AGENTPHONE_BASE_URL || "https://api.agentphone.ai";
/** SMS is a shout, not a report — one line, with a pointer to the long version. */
const SMS_MAX = 300;

export async function sendEmail(subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { channel: "email", skipped: "RESEND_API_KEY unset" };
  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.SUBMIT_FROM || "The SoKno Ear <ear@updates.note15.com>",
      to: process.env.ALERT_TO || process.env.SUBMIT_TO || "andy@note15.com",
      subject: `[SYSTEM_ALERT] [soknoear] ${subject}`,
      text: (text ?? "").replace(/\\n/g, "\n"),
    });
    return error ? { channel: "email", error: JSON.stringify(error).slice(0, 200) } : { channel: "email", sent: true };
  } catch (err) {
    return { channel: "email", error: String(err.message ?? err).slice(0, 200) };
  }
}

export async function sendSms(subject, text) {
  const apiKey = process.env.AGENTPHONE_API_KEY;
  const to = process.env.ALERT_SMS_TO;
  if (!apiKey) return { channel: "sms", skipped: "AGENTPHONE_API_KEY unset" };
  if (!to) return { channel: "sms", skipped: "ALERT_SMS_TO unset" };

  const oneLine = `${subject}${text ? ` — ${String(text).replace(/\\n/g, " ").replace(/\s+/g, " ").trim()}` : ""}`;
  const body = oneLine.length > SMS_MAX ? `${oneLine.slice(0, SMS_MAX - 1)}…` : oneLine;
  const payload = { to_number: to, body };
  if (process.env.AGENTPHONE_AGENT_ID) payload.agent_id = process.env.AGENTPHONE_AGENT_ID;
  else if (process.env.AGENTPHONE_FROM_NUMBER) payload.from_number = process.env.AGENTPHONE_FROM_NUMBER;

  try {
    const res = await fetch(`${AGENTPHONE_BASE}/v1/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { channel: "sms", error: `AgentPhone ${res.status}: ${t.slice(0, 200)}` };
    }
    return { channel: "sms", sent: true };
  } catch (err) {
    return { channel: "sms", error: String(err.message ?? err).slice(0, 200) };
  }
}

export async function notify(subject, text) {
  const results = await Promise.all([sendEmail(subject, text), sendSms(subject, text)]);
  return { results, delivered: results.some((r) => r.sent) };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const [subject, text] = process.argv.slice(2);
  if (!subject) { console.error("notify: usage: notify.mjs \"<subject>\" \"<text>\""); process.exit(2); }
  const { results, delivered } = await notify(subject, text);
  for (const r of results) {
    if (r.sent) console.log(`notify: ${r.channel} sent`);
    else if (r.skipped) console.log(`notify: ${r.channel} skipped (${r.skipped})`);
    else console.error(`notify: ${r.channel} FAILED — ${r.error}`);
  }
  process.exit(delivered ? 0 : 1);
}
