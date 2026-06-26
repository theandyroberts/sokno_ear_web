import { Resend } from "resend";
import type { Submission, Contact } from "./db";

const FROM = process.env.SUBMIT_FROM || "The SoKno Ear <ear@send.note15.com>";
const TO = process.env.SUBMIT_TO || "andy@note15.com";

export async function sendSubmissionEmail(s: Submission): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const lines = [
    `Headline: ${s.headline}`,
    `Details: ${s.details}`,
    s.dates ? `Dates: ${s.dates}` : "",
    s.url ? `Link: ${s.url}` : "",
    s.contact ? `Contact: ${s.contact}` : "",
  ].filter(Boolean).join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to: TO, subject: `New event/news: ${s.headline}`, text: lines,
  });
  if (error) console.error("[mail] resend error", error);
}

export async function sendContactEmail(c: Contact): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const lines = [c.name ? `From: ${c.name}` : "", `Email: ${c.email}`, "", c.message].filter(Boolean).join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to: TO, replyTo: c.email,
    subject: `Contact via soknoear.com${c.name ? ` — ${c.name}` : ""}`, text: lines,
  });
  if (error) console.error("[mail] resend error", error);
}
