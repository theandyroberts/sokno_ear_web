import { NextResponse } from "next/server";
import {
  buildAgentPhoneListingDraft,
  deriveAgentPhoneWebhookId,
  shouldRequireAgentPhoneSignature,
  verifyAgentPhoneSignature,
  type AgentPhonePayload,
} from "@/lib/agentphone";
import { attachSubmissionToAgentPhoneIntake, db, insertAgentPhoneIntake, insertSubmission } from "@/lib/db";
import { sendSubmissionEmail } from "@/lib/mail";
import { extractListingWithOpenAI } from "@/lib/openai-listing-extractor";
import { createAndNotifyStoryDraft } from "@/lib/story-drafter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.AGENTPHONE_WEBHOOK_SECRET;

  if (secret) {
    const verified = verifyAgentPhoneSignature(rawBody, req.headers, secret);
    if (!verified.ok) return NextResponse.json({ error: verified.reason || "bad signature" }, { status: 401 });
  } else if (shouldRequireAgentPhoneSignature()) {
    console.error("[agentphone] AGENTPHONE_WEBHOOK_SECRET is required for production webhook verification");
    return NextResponse.json({ error: "webhook secret not configured" }, { status: 500 });
  }

  let payload: AgentPhonePayload;
  try {
    payload = JSON.parse(rawBody) as AgentPhonePayload;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const fallbackDraft = buildAgentPhoneListingDraft(payload);
  const draft = await extractListingWithOpenAI(payload, fallbackDraft);
  const webhookId = req.headers.get("x-webhook-id") || deriveAgentPhoneWebhookId(payload);
  const store = db();
  const intake = insertAgentPhoneIntake(store, {
    webhookId,
    event: payload.event || "",
    channel: payload.channel || "",
    agentId: payload.agentId || "",
    callId: draft.callId,
    listingStatus: draft.listingStatus,
    missingFields: draft.missingFields,
    payloadJson: rawBody,
    transcriptText: draft.transcriptText,
    summary: draft.summary,
  });

  if (intake.duplicate) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      intakeId: intake.id,
      submissionId: intake.submissionId,
    });
  }

  let submissionId: number | null = null;
  if (draft.ready && draft.submission) {
    submissionId = insertSubmission(store, draft.submission);
    attachSubmissionToAgentPhoneIntake(store, intake.id, submissionId);
    await sendSubmissionEmail(draft.submission);
  }

  // Draft the story at intake time — for ready calls AND needs_review ones, so
  // follow-up questions reach Andy while the caller is still reachable.
  let storyDraftId: number | null = null;
  if (!draft.ignored && payload.event === "agent.call_ended") {
    storyDraftId = await createAndNotifyStoryDraft(store, {
      source: "phone",
      submissionId,
      intakeId: intake.id,
      headline: draft.title || draft.summary || "Phone intake",
      details: [draft.venue && `Venue: ${draft.venue}`, draft.offer && `Offer: ${draft.offer}`]
        .filter(Boolean).join("\n"),
      dates: draft.schedule,
      contact: draft.contact ? `AgentPhone caller ${draft.contact}` : "AgentPhone caller",
      summary: draft.summary,
      transcript: draft.transcriptText,
      missingFields: draft.missingFields,
    });
  }

  return NextResponse.json({
    ok: true,
    intakeId: intake.id,
    submissionId,
    storyDraftId,
    ready: draft.ready,
    ignored: draft.ignored,
    missingFields: draft.missingFields,
  });
}
