import crypto from "node:crypto";
import type { Submission } from "./db";

type JsonRecord = Record<string, unknown>;

export type AgentPhonePayload = {
  event?: string;
  channel?: string;
  timestamp?: string;
  agentId?: string;
  data?: JsonRecord;
  conversationState?: unknown;
  recentHistory?: unknown;
};

export type ListingDraft = {
  ready: boolean;
  ignored: boolean;
  listingStatus: "ready" | "needs_review" | "ignored";
  missingFields: string[];
  listingType: "event" | "drink_special" | "food_special" | "special" | "unknown";
  title: string;
  venue: string;
  offer: string;
  schedule: string;
  audience: string;
  promoLine: string;
  contact: string;
  callId: string;
  transcriptText: string;
  summary: string;
  submission?: Submission;
};

const DAY_RE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:night|morning|afternoon|evening))?\b/i;

export function shouldRequireAgentPhoneSignature(): boolean {
  if (process.env.AGENTPHONE_WEBHOOK_REQUIRE_SIGNATURE === "true") return true;
  if (process.env.AGENTPHONE_WEBHOOK_REQUIRE_SIGNATURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function verifyAgentPhoneSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): { ok: boolean; reason?: string } {
  const signature = headers.get("x-webhook-signature") ?? "";
  const timestamp = headers.get("x-webhook-timestamp") ?? "";
  if (!signature || !timestamp) return { ok: false, reason: "missing signature headers" };

  const deliveredAt = Number(timestamp);
  if (!Number.isFinite(deliveredAt)) return { ok: false, reason: "bad signature timestamp" };
  if (Math.abs(Date.now() / 1000 - deliveredAt) > 300) {
    return { ok: false, reason: "stale signature timestamp" };
  }

  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expected = Buffer.from(`sha256=${digest}`);
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return { ok: false, reason: "signature mismatch" };
  if (!crypto.timingSafeEqual(expected, received)) return { ok: false, reason: "signature mismatch" };
  return { ok: true };
}

export function deriveAgentPhoneWebhookId(payload: AgentPhonePayload): string {
  const data = asRecord(payload.data);
  const uniqueId = firstString(data, ["callId", "conversationId", "messageId", "id"]) || payload.timestamp || "unknown";
  return ["derived", payload.event || "event", uniqueId].join(":");
}

export function buildAgentPhoneListingDraft(payload: AgentPhonePayload): ListingDraft {
  const data = asRecord(payload.data);
  const event = payload.event || "";
  const channel = payload.channel || "";
  const callId = firstString(data, ["callId", "conversationId", "messageId", "id"]);
  const summary = firstString(data, ["summary", "analysisSummary"]) || "";
  const transcriptText = getTranscriptText(payload);
  const allText = [summary, transcriptText, getRecentHistoryText(payload.recentHistory)].filter(Boolean).join("\n");
  const searchRoots = [data, asRecord(payload.conversationState)];

  const ignored =
    event === "agent.reaction" ||
    (event === "agent.message" && channel === "voice" && String(data.status ?? "").toLowerCase() === "in-progress");

  const listingType = detectListingType(searchRoots, allText);
  const promoLine = cleanField(
    findStringByKeys(searchRoots, ["promoLine", "promo", "shortPromo", "flyerLine", "smsLine"]) ||
      extractPromoLine(payload, allText)
  );
  const venue = cleanField(
    findStringByKeys(searchRoots, ["venue", "venueName", "locationName", "businessName", "barName", "restaurantName", "place"]) ||
      extractVenue(allText)
  );
  const offer = cleanField(
    findStringByKeys(searchRoots, ["offer", "special", "deal", "drinkSpecial", "foodSpecial", "price", "promotion"]) ||
      extractOffer(allText)
  );
  const schedule = cleanField(
    findStringByKeys(searchRoots, ["schedule", "date", "dates", "day", "days", "time", "timeWindow", "startDate", "when"]) ||
      extractSchedule(allText)
  );
  const audience = cleanField(findStringByKeys(searchRoots, ["audience", "crowd"]) || extractAudience(allText));
  const title = cleanField(
    findStringByKeys(searchRoots, ["title", "headline", "eventTitle", "listingTitle"]) ||
      promoLine ||
      buildFallbackTitle(venue, offer, listingType)
  );
  const contact = cleanField(firstString(data, ["from", "fromNumber", "senderIdentifier"]) || "");

  const missingFields = ignored ? [] : missingListingFields(listingType, { title, venue, offer, schedule });
  const ready = !ignored && missingFields.length === 0;
  const listingStatus = ignored ? "ignored" : ready ? "ready" : "needs_review";
  const submission = ready
    ? buildSubmission({ title, detailsSource: { listingType, venue, offer, schedule, audience, promoLine, summary, transcriptText, callId }, contact })
    : undefined;

  return {
    ready,
    ignored,
    listingStatus,
    missingFields,
    listingType,
    title,
    venue,
    offer,
    schedule,
    audience,
    promoLine,
    contact,
    callId,
    transcriptText,
    summary,
    submission,
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function firstString(record: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function findStringByKeys(roots: JsonRecord[], keys: string[]): string {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const root of roots) {
    const found = findStringByKeysInValue(root, wanted, 0);
    if (found) return found;
  }
  return "";
}

function findStringByKeysInValue(value: unknown, wanted: Set<string>, depth: number): string {
  if (!value || typeof value !== "object" || depth > 4) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKeysInValue(item, wanted, depth + 1);
      if (found) return found;
    }
    return "";
  }
  for (const [key, entry] of Object.entries(value)) {
    if (wanted.has(key.toLowerCase()) && (typeof entry === "string" || typeof entry === "number")) {
      return String(entry).trim();
    }
    const found = findStringByKeysInValue(entry, wanted, depth + 1);
    if (found) return found;
  }
  return "";
}

function detectListingType(roots: JsonRecord[], text: string): ListingDraft["listingType"] {
  const structured = findStringByKeys(roots, ["listingType", "type", "category"]);
  const haystack = `${structured}\n${text}`.toLowerCase();
  if (/\bdrink|pint|beer|cocktail|margarita|wine|bar\b/.test(haystack)) return "drink_special";
  if (/\bfood|taco|burger|pizza|brunch|dinner|lunch|restaurant\b/.test(haystack)) return "food_special";
  if (/\bspecial|deal|promo|promotion\b/.test(haystack)) return "special";
  if (/\bevent|show|concert|market|class|workshop|party|festival|trivia|karaoke\b/.test(haystack)) return "event";
  return "unknown";
}

function getTranscriptText(payload: AgentPhonePayload): string {
  const data = asRecord(payload.data);
  const transcript = data.transcript;
  if (typeof transcript === "string") return transcript.trim();
  if (Array.isArray(transcript)) return transcriptTurnsToText(transcript);
  return firstString(data, ["message"]);
}

function getRecentHistoryText(recentHistory: unknown): string {
  if (!Array.isArray(recentHistory)) return "";
  return transcriptTurnsToText(recentHistory);
}

function transcriptTurnsToText(turns: unknown[]): string {
  return turns
    .map((turn) => {
      if (typeof turn === "string") return turn.trim();
      const record = asRecord(turn);
      const content = firstString(record, ["content", "message", "transcript", "text"]);
      if (!content) return "";
      const role = firstString(record, ["role", "direction", "speaker"]);
      return role ? `${role}: ${content}` : content;
    })
    .filter(Boolean)
    .join("\n");
}

function extractPromoLine(payload: AgentPhonePayload, text: string): string {
  const turns = Array.isArray(payload.data?.transcript) ? payload.data.transcript : [];
  const userLines = turns
    .map((turn) => {
      const record = asRecord(turn);
      const role = firstString(record, ["role", "direction", "speaker"]).toLowerCase();
      const content = firstString(record, ["content", "message", "transcript", "text"]);
      return role === "user" || role === "inbound" || role === "customer" ? content : "";
    })
    .filter((line) => line && !/^(yes|yeah|yep|thanks|thank you|that's perfect|that is perfect)\.?$/i.test(line.trim()));
  if (userLines.length) return userLines[userLines.length - 1];

  const quoted = [...text.matchAll(/"([^"]{8,160})"/g)].map((match) => match[1].trim());
  if (quoted.length) return quoted[quoted.length - 1];
  return "";
}

function extractVenue(text: string): string {
  const patterns = [
    /\b(?:bar|venue|restaurant|place|business)\s+(?:is\s+)?called\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
    /\bcalled\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
    /\bat\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = `${match?.[1] || ""}${match?.[2] || ""}`;
    if (value) return titleCase(value);
  }
  return "";
}

function extractOffer(text: string): string {
  const price = text.match(/\b(?:\$?\d+(?:\.\d{2})?|two dollars?(?: and fifty cents?)?|two dollar and fifty cent|two fifty|2\.50)\b[^.\n]{0,80}/i);
  if (price) return cleanField(price[0]);
  const special = text.match(/\b(?:special|deal|offer|promo(?:tion)?)\b[^.\n]{0,100}/i);
  return special ? cleanField(special[0]) : "";
}

function extractSchedule(text: string): string {
  const day = text.match(DAY_RE)?.[0] || "";
  const allNight = /\ball night\b/i.test(text);
  const windowMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[1] || "";
  if (day && allNight) return `${titleCase(day)} all night`;
  if (day && windowMatch) return `${titleCase(day)} ${windowMatch}`;
  if (day) return titleCase(day);
  if (allNight) return "All night";
  return windowMatch;
}

function extractAudience(text: string): string {
  const match = text.match(/\b(?:for|crowd is|crowd:)\s+([A-Za-z0-9 '&.-]{3,60})(?:[.,\n]|$)/i);
  return match?.[1] ? cleanField(match[1]) : "";
}

function buildFallbackTitle(venue: string, offer: string, listingType: ListingDraft["listingType"]): string {
  if (venue && offer) return `${venue}: ${offer}`;
  if (offer) return offer;
  if (venue && listingType !== "unknown") return `${venue} ${listingType.replace("_", " ")}`;
  return "";
}

function missingListingFields(
  listingType: ListingDraft["listingType"],
  fields: { title: string; venue: string; offer: string; schedule: string }
): string[] {
  const missing: string[] = [];
  if (listingType === "unknown") missing.push("listing type");
  if (!fields.venue) missing.push("venue");
  if (listingType === "event") {
    if (!fields.title) missing.push("event title");
    if (!fields.schedule) missing.push("date/time");
    return missing;
  }
  if (!fields.offer && !fields.title) missing.push("offer or promo line");
  if (!fields.schedule) missing.push("day/time");
  return missing;
}

function buildSubmission(input: {
  title: string;
  contact: string;
  detailsSource: Pick<
    ListingDraft,
    "listingType" | "venue" | "offer" | "schedule" | "audience" | "promoLine" | "summary" | "transcriptText" | "callId"
  >;
}): Submission {
  const source = input.detailsSource;
  const details = [
    `Source: AgentPhone${source.callId ? ` call ${source.callId}` : ""}`,
    `Type: ${source.listingType.replace("_", " ")}`,
    source.venue ? `Venue: ${source.venue}` : "",
    source.offer ? `Offer: ${source.offer}` : "",
    source.schedule ? `Schedule: ${source.schedule}` : "",
    source.audience ? `Audience: ${source.audience}` : "",
    source.promoLine ? `Promo line: ${source.promoLine}` : "",
    source.summary ? `Call summary: ${source.summary}` : "",
    source.transcriptText ? `Transcript:\n${source.transcriptText}` : "",
  ].filter(Boolean).join("\n");

  return {
    headline: input.title.slice(0, 300),
    details: details.slice(0, 5000),
    dates: source.schedule.slice(0, 200),
    contact: input.contact ? `AgentPhone caller ${input.contact}`.slice(0, 300) : "AgentPhone caller",
  };
}

function cleanField(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[-:;\s]+|[-:;\s]+$/g, "").trim();
}

function titleCase(value: string): string {
  return cleanField(value).replace(/\b[a-z]/g, (char) => char.toUpperCase());
}
