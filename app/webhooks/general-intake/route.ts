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

  return NextResponse.json({
    ok: true,
    intakeId: intake.id,
    submissionId,
    ready: draft.ready,
    ignored: draft.ignored,
    missingFields: draft.missingFields,
  });
}
