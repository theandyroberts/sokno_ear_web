import type { AgentPhonePayload } from "./agentphone";

type MessageAckResult = { attempted: boolean; sent: boolean; error?: string };

const MESSAGE_CHANNELS = new Set(["sms", "mms", "imessage"]);

export function isInboundTextMessage(payload: AgentPhonePayload): boolean {
  const data = asRecord(payload.data);
  return payload.event === "agent.message" &&
    MESSAGE_CHANNELS.has(payload.channel || "") &&
    String(data.direction || "inbound").toLowerCase() === "inbound";
}

export async function sendAgentPhoneTextAck(payload: AgentPhonePayload): Promise<MessageAckResult> {
  if (!isInboundTextMessage(payload)) return { attempted: false, sent: false };

  const apiKey = process.env.AGENTPHONE_API_KEY;
  if (!apiKey) {
    console.warn("[agentphone] AGENTPHONE_API_KEY unset - cannot send text acknowledgement");
    return { attempted: true, sent: false, error: "AGENTPHONE_API_KEY unset" };
  }

  const data = asRecord(payload.data);
  const toNumber = stringValue(data.from) || stringValue(data.senderIdentifier);
  if (!toNumber) return { attempted: true, sent: false, error: "missing sender number" };

  const body = acknowledgementBody(stringValue(data.message));
  const requestBody: Record<string, string> = {
    to_number: toNumber,
    body,
  };
  if (payload.agentId) requestBody.agent_id = payload.agentId;
  else if (stringValue(data.numberId)) requestBody.number_id = stringValue(data.numberId);
  else if (stringValue(data.to)) requestBody.from_number = stringValue(data.to);

  try {
    const res = await fetch("https://api.agentphone.ai/v1/messages", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { attempted: true, sent: false, error: `AgentPhone ${res.status}: ${text.slice(0, 300)}` };
    }
    return { attempted: true, sent: true };
  } catch (err) {
    return { attempted: true, sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function acknowledgementBody(message: string): string {
  if (/https?:\/\/|www\./i.test(message)) {
    return "Got it - the SoKno Ear received your link and will include it with the review.";
  }
  if (/\b(correct|correction|actually|update|fix|change)\b/i.test(message)) {
    return "Got it - the SoKno Ear received that correction.";
  }
  return "Got it - the SoKno Ear received your text and will include it with the review.";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}
