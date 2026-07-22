import { Resend } from "resend";
import type { Submission, Contact } from "./db";

const FROM = process.env.SUBMIT_FROM || "The SoKno Ear <ear@updates.note15.com>";
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
    "The city desk reviews every item and decides what runs in the Ear.",
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

/** To a brand-new subscriber, immediately on signup. */
export async function sendWelcomeEmail(to: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const HOME = "https://soknoear.com";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#e9dcc4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9dcc4;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#F3E8D2;border:1px solid #171512;">
  <tr><td align="center" style="padding:22px 24px 8px;">
    <a href="${HOME}" target="_blank" style="text-decoration:none;color:#171512;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:bold;letter-spacing:0.02em;text-transform:uppercase;color:#171512;">★ The South Knoxville Ear ★</div>
      <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#A94A34;margin-top:5px;">South Knoxville Events &amp; Rumors</div>
    </a>
  </td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:2px solid #171512;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:18px 24px 2px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;color:#171512;">Hey neighbor — welcome aboard.</td></tr>
  <tr><td style="padding:6px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#171512;">
    The SoKno Ear is South Knoxville&rsquo;s weekly read on what&rsquo;s happening close to home — events, openings,
    and neighborhood news from Sevier Avenue to Kern&rsquo;s to Ijams Park. Once a week, when a fresh issue is up,
    you&rsquo;ll get one short email like this. That&rsquo;s it — no spam, ever.
  </td></tr>
  <tr><td align="center" style="padding:14px 24px 6px;">
    <a href="${HOME}" target="_blank" style="display:inline-block;background:#A94A34;color:#F3E8D2;text-decoration:none;font-family:Georgia,serif;font-weight:bold;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;padding:13px 28px;border-radius:6px;">★ Read this week's Ear</a>
  </td></tr>
  <tr><td style="padding:14px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#171512;">
    And one neighborly favor: if you know about something coming up — a show, a pop-up, a grand opening, a
    food or drink special — <strong>call or text it in to ${""}865-252-6500</strong>. An assistant answers 24/7,
    and the good stuff ends up in the Ear.
  </td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:1px solid #c9b896;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:14px 24px 20px;font-family:Georgia,serif;font-size:12px;line-height:1.5;color:#7a7060;">You're getting this because you signed up at soknoear.com. Change your mind? Just reply and I'll take you off the list. — Andy</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Hey neighbor — welcome aboard.

The SoKno Ear is South Knoxville's weekly read on what's happening close to home — events, openings, and neighborhood news from Sevier Avenue to Kern's to Ijams Park. Once a week, when a fresh issue is up, you'll get one short email like this. That's it — no spam, ever.

Read this week's Ear: ${HOME}

And one neighborly favor: if you know about something coming up — a show, a pop-up, a grand opening, a food or drink special — call or text it in to 865-252-6500. An assistant answers 24/7, and the good stuff ends up in the Ear.

You're getting this because you signed up at soknoear.com. Change your mind? Just reply and I'll take you off the list. — Andy`;
  const { error } = await resend.emails.send({
    from: FROM, to, replyTo: TO,
    subject: "Welcome to the SoKno Ear — you're on the list",
    html, text,
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
