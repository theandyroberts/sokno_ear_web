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

type DraftForEmail = {
  title: string;
  deck: string;
  label: string;
  days: string[];
  facts: { label: string; value: string }[];
  paragraphs: string[];
  followUpQuestions: string[];
  confidence: number;
};

export async function sendStoryDraftEmail(
  draft: DraftForEmail,
  meta: { id: number; source: "form" | "phone"; contact?: string; missingFields?: string[]; draftUrl?: string; sentTo?: string }
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const needsFollowUp = draft.followUpQuestions.length > 0;
  const lines = [
    `Draft #${meta.id} · from a ${meta.source === "phone" ? "phone call" : "form submission"}${meta.contact ? ` · ${meta.contact}` : ""}`,
    meta.draftUrl ? `Draft page: ${meta.draftUrl}` : "",
    meta.sentTo
      ? `Review link emailed to verified submitter: ${meta.sentTo}`
      : "No verified submitter matched — city desk follow-up.",
    "",
    `Pill: ${draft.label}${draft.days.length ? ` · Days: ${draft.days.join(", ")}` : ""}`,
    `Headline: ${draft.title}`,
    draft.deck ? `Deck: ${draft.deck}` : "",
    draft.facts.length ? ["", "Facts:", ...draft.facts.map((f) => `  ${f.label}: ${f.value}`)].join("\n") : "",
    "",
    ...draft.paragraphs,
    needsFollowUp ? ["", "— Follow up before it runs —", ...draft.followUpQuestions.map((q) => `  • ${q}`)].join("\n") : "",
    meta.missingFields?.length ? `Intake flagged missing: ${meta.missingFields.join(", ")}` : "",
    "",
    `The draft is stored (story_drafts #${meta.id}) and will be picked up at the next edition build.`,
  ].filter(Boolean).join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to: TO,
    subject: `${needsFollowUp ? "Draft needs follow-up" : "Story draft ready"}: ${draft.title}`.slice(0, 200),
    text: lines,
  });
  if (error) console.error("[mail] resend error", error);
}

/** To a verified submitter: link to review the draft of their submission. */
export async function sendDraftLinkEmail(
  to: string,
  d: { name?: string; title: string; draftUrl: string }
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const text = [
    `Hi${d.name ? ` ${d.name}` : ""} —`,
    "",
    `Thanks for your submission to The South Knoxville Ear. We've written up a draft:`,
    "",
    `  "${d.title}"`,
    `  ${d.draftUrl}`,
    "",
    "Take a look and use the comment box on that page to correct anything or fill in what we're missing.",
    "The city desk reviews every item and decides what runs in the paper.",
    "",
    "— The SoKno Ear",
  ].join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to, replyTo: TO,
    subject: `Your SoKno Ear submission — draft ready to review`,
    text,
  });
  if (error) console.error("[mail] resend error", error);
}

/** To the city desk: a submitter commented on a draft. */
export async function sendDraftCommentEmail(
  c: { draftId: number; title: string; name?: string; comment: string; draftUrl: string }
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: FROM, to: TO,
    subject: `Draft comment${c.name ? ` from ${c.name}` : ""}: ${c.title}`.slice(0, 200),
    text: [
      `Draft #${c.draftId} — "${c.title}"`,
      c.draftUrl,
      "",
      c.comment,
    ].join("\n"),
  });
  if (error) console.error("[mail] resend error", error);
}

/** To the city desk: someone registered as a verified submitter. */
export async function sendSubmitterRegistrationEmail(
  p: { name: string; phone?: string; email: string; linkedDrafts: number }
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: FROM, to: TO,
    subject: `New verified submitter: ${p.name}`,
    text: [
      `${p.name} registered as a verified submitter.`,
      `Email: ${p.email}`,
      p.phone ? `Phone: ${p.phone}` : "",
      p.linkedDrafts > 0
        ? `Matched ${p.linkedDrafts} pending draft(s) — review link(s) emailed to them.`
        : "No pending drafts matched.",
    ].filter(Boolean).join("\n"),
  });
  if (error) console.error("[mail] resend error", error);
}

export async function sendSubscriberEmail(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: FROM, to: TO,
    subject: `New Ear subscriber: ${email}`,
    text: `${email} just signed up to be notified about The South Knoxville Ear.`,
  });
  if (error) console.error("[mail] resend error", error);
}
