// Email Andy from the VPS watchdog. Usage: node scripts/alert.mjs "<subject>" "<text>"
// Needs RESEND_API_KEY in env (healthcheck.sh sources .env first).
// Recipient: ALERT_TO (the loud channel — a +system_alert address Andy filters on),
// falling back to SUBMIT_TO, then the desk default.
import { Resend } from "resend";
const [subject, text] = process.argv.slice(2);
const key = process.env.RESEND_API_KEY;
if (!key || !subject) { console.error("alert: missing RESEND_API_KEY or subject"); process.exit(1); }
const resend = new Resend(key);
const { error } = await resend.emails.send({
  from: process.env.SUBMIT_FROM || "The SoKno Ear <ear@updates.note15.com>",
  to: process.env.ALERT_TO || process.env.SUBMIT_TO || "andy@note15.com",
  subject: `[soknoear watchdog] ${subject}`,
  text: (text ?? "").replace(/\\n/g, "\n"),
});
if (error) { console.error("alert: resend error", error); process.exit(1); }
console.log("alert sent:", subject);
