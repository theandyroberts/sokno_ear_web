import crypto from "node:crypto";
import type { Submission } from "./db";

type JsonRecord = Record<string, unknown>;
type TranscriptTurn = { role: string; content: string };

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
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WORD_NUMBERS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
};
const TIME_TOKEN = "(noon|midnight|\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s*(?:a\\.?m\\.?|p\\.?m\\.?))";

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
  const transcriptTurns = getTranscriptTurns(payload);
  const transcriptText = getTranscriptText(payload, transcriptTurns);
  const allText = [summary, transcriptText, getRecentHistoryText(payload.recentHistory)].filter(Boolean).join("\n");
  const searchRoots = [data, asRecord(payload.conversationState)];

  const ignored =
    event === "agent.reaction" ||
    (event === "agent.message" && channel === "voice" && String(data.status ?? "").toLowerCase() === "in-progress");

  const listingType = detectListingType(searchRoots, allText);
  const promoLine = cleanField(validPromoLine(extractPromoLine(transcriptTurns, allText)) ||
    validPromoLine(findStringByKeys(searchRoots, ["promoLine", "promo", "shortPromo", "flyerLine", "smsLine"])));
  const venue = cleanField(
    extractVenue(allText) ||
      validVenue(findStringByKeys(searchRoots, ["venue", "venueName", "locationName", "businessName", "barName", "restaurantName", "place"]))
  );
  const offer = cleanField(
    extractOffer(allText) ||
      validOffer(findStringByKeys(searchRoots, ["offer", "special", "deal", "drinkSpecial", "foodSpecial", "price", "promotion"]))
  );
  const schedule = cleanField(
    extractSchedule(allText, payload) ||
      validSchedule(findStringByKeys(searchRoots, ["schedule", "date", "dates", "day", "days", "time", "timeWindow", "startDate", "when"]))
  );
  const audience = cleanField(extractAudience(transcriptTurns) || validAudience(findStringByKeys(searchRoots, ["audience", "crowd"])));
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

function getTranscriptTurns(payload: AgentPhonePayload): TranscriptTurn[] {
  const data = asRecord(payload.data);
  const transcript = data.transcript;
  if (!Array.isArray(transcript)) return [];
  return transcript
    .map((turn) => {
      if (typeof turn === "string") return { role: "", content: turn.trim() };
      const record = asRecord(turn);
      return {
        role: firstString(record, ["role", "direction", "speaker"]).toLowerCase(),
        content: firstString(record, ["content", "message", "transcript", "text"]),
      };
    })
    .filter((turn) => turn.content);
}

function getTranscriptText(payload: AgentPhonePayload, turns = getTranscriptTurns(payload)): string {
  const data = asRecord(payload.data);
  const transcript = data.transcript;
  if (typeof transcript === "string") return transcript.trim();
  if (turns.length) return transcriptTurnsToText(turns);
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

function extractPromoLine(turns: TranscriptTurn[], text: string): string {
  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    if (!isAgentRole(turn.role) || !/\b(promo|flyer|sms|blast|tagline|line)\b/i.test(turn.content)) continue;
    const answer = nextUserAnswer(turns, i);
    if (answer && !isTimeAnswer(answer)) return answer;
  }

  const quoted = [...text.matchAll(/"([^"]{8,160})"/g)].map((match) => match[1].trim());
  if (quoted.length) return quoted[quoted.length - 1];
  return "";
}

function extractVenue(text: string): string {
  const patterns = [
    /\b(?:drink|food)?\s*special\s+for\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
    /\b(?:bar|venue|restaurant|place|business)\s+(?:is\s+)?called\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
    /\bcalled\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
    /\bat\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
    /\bfor\s+(the\s+)?([A-Za-z0-9][A-Za-z0-9 '&-]{2,60})(?:[.,\n]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = normalizeVenue(`${match?.[1] || ""}${match?.[2] || ""}`, text);
    if (value) return value;
  }
  return "";
}

function extractOffer(text: string): string {
  const price = text.match(/\b(?:\$?\d+(?:\.\d{2})?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+dollars?|two dollars?(?: and fifty cents?)?|two dollar and fifty cent|two fifty|2\.50)\b[^.\n]{0,120}/i);
  if (price) return cleanOffer(price[0]);
  const special = text.match(/\b(?:special|deal|offer|promo(?:tion)?)\b(?!\s+for\b)[^.\n]{0,100}/i);
  return special ? cleanOffer(special[0]) : "";
}

function extractSchedule(text: string, payload: AgentPhonePayload): string {
  const day = text.match(DAY_RE)?.[0] || "";
  const allNight = /\ball night\b/i.test(text);
  const windowMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[1] || "";
  const start = extractStartTime(text);
  const end = extractEndTime(text);
  const datedDay = day && (start || end) ? enrichDayWithDate(day, payload) : titleCase(day);
  if (datedDay && start && end) return `${datedDay}, ${start} to ${end}`;
  if (datedDay && start) return `${datedDay}, starting at ${start}`;
  if (datedDay && end) return `${datedDay}, until ${end}`;
  if (day && allNight) return `${titleCase(day)} all night`;
  if (day && windowMatch) return `${titleCase(day)} ${windowMatch}`;
  if (day) return titleCase(day);
  if (allNight) return "All night";
  return windowMatch;
}

function extractAudience(turns: TranscriptTurn[]): string {
  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    if (!isAgentRole(turn.role) || !/\b(crowd|audience)\b/i.test(turn.content)) continue;
    const answer = nextUserAnswer(turns, i);
    const match = answer.match(/\bfor\s+([^.\n]+?)(?:\s+and\s+it'?s\b|[.,\n]|$)/i);
    return cleanField(match?.[1] || answer);
  }
  return "";
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

function isAgentRole(role: string): boolean {
  return role === "agent" || role === "assistant" || role === "outbound";
}

function isUserRole(role: string): boolean {
  return role === "user" || role === "inbound" || role === "customer" || role === "";
}

function nextUserAnswer(turns: TranscriptTurn[], index: number): string {
  for (let i = index + 1; i < turns.length; i += 1) {
    if (isUserRole(turns[i].role)) return cleanField(turns[i].content);
    if (isAgentRole(turns[i].role)) return "";
  }
  return "";
}

function normalizeVenue(candidate: string, fullText: string): string {
  const cleaned = cleanField(candidate)
    .replace(/\b(?:on|at|starting|starts?|from|until|till|through)\b.*$/i, "")
    .replace(/\b(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b.*$/i, "")
    .trim();
  const valid = validVenue(cleaned);
  if (!valid) return "";
  const base = /\bhi[-\s]?wire|high wire\b/i.test(valid)
    ? "Hi-Wire"
    : titleCase(valid.replace(/^the\s+/i, ""));
  const location = extractVenueLocation(fullText);
  return location && !base.toLowerCase().includes(location.toLowerCase()) ? `${base} on ${location}` : base;
}

function extractVenueLocation(text: string): string {
  if (/\bon\s+sevier\s+avenue\b/i.test(text)) return "Sevier Avenue";
  return "";
}

function validVenue(value: string): string {
  const cleaned = cleanField(value);
  if (!cleaned) return "";
  if (/^(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)?|all night)$/i.test(cleaned)) return "";
  if (DAY_RE.test(cleaned)) return "";
  if (/\b(starting|starts?|until|till|through|special|deal|offer|margarita|bloody mary|pint|beer|cocktail)\b/i.test(cleaned)) return "";
  return cleaned;
}

function validOffer(value: string): string {
  const cleaned = cleanOffer(value);
  if (!cleaned || /\bspecial\s+for\s+(the\s+)?[A-Za-z]/i.test(cleaned)) return "";
  return cleaned;
}

function validSchedule(value: string): string {
  const cleaned = cleanField(value);
  if (!cleaned || /^(noon|midnight)$/i.test(cleaned)) return "";
  return cleaned;
}

function validAudience(value: string): string {
  const cleaned = cleanField(value);
  if (!cleaned || /\b(high wire|hi-wire|sevier|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(cleaned)) return "";
  return cleaned;
}

function validPromoLine(value: string): string {
  const cleaned = cleanField(value);
  if (!cleaned || isTimeAnswer(cleaned)) return "";
  return cleaned;
}

function cleanOffer(value: string): string {
  return cleanField(value)
    .replace(/\s+(?:starting|starts?|beginning|begins)\s+at\s+.+$/i, "")
    .replace(/\s+(?:on|at)\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b.*$/i, "")
    .replace(/\s+at\s+(?:the\s+)?[A-Za-z0-9 '&-]+$/i, "")
    .trim();
}

function extractStartTime(text: string): string {
  const match = text.match(new RegExp(`\\b(?:starting|starts?|begin(?:s|ning)?|from)\\s+(?:at\\s+)?${TIME_TOKEN}\\b`, "i"));
  return match?.[1] ? normalizeTime(match[1]) : "";
}

function extractEndTime(text: string): string {
  const match = text.match(new RegExp(`\\b(?:until|till|til|through|to)\\s+${TIME_TOKEN}\\b`, "i"));
  return match?.[1] ? normalizeTime(match[1]) : "";
}

function normalizeTime(value: string): string {
  const cleaned = cleanField(value).toLowerCase().replace(/\./g, "");
  if (cleaned === "noon" || cleaned === "midnight") return cleaned;
  const word = cleaned.match(/^([a-z]+)\s*(am|pm)$/i);
  if (word && WORD_NUMBERS[word[1]]) return `${WORD_NUMBERS[word[1]]} ${word[2].toUpperCase()}`;
  return cleaned.replace(/\s*(am|pm)$/i, (_, meridiem: string) => ` ${meridiem.toUpperCase()}`);
}

function isTimeAnswer(value: string): boolean {
  const cleaned = cleanField(value);
  return new RegExp(`\\b(?:until|till|til|through|to)\\s+${TIME_TOKEN}\\b`, "i").test(cleaned) ||
    new RegExp(`^${TIME_TOKEN}$`, "i").test(cleaned);
}

function enrichDayWithDate(day: string, payload: AgentPhonePayload): string {
  const weekday = WEEKDAYS.findIndex((name) => day.toLowerCase().startsWith(name));
  if (weekday < 0) return titleCase(day);

  const base = payloadTimestamp(payload);
  if (!base) return titleCase(day);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(base).reduce<Record<string, number>>((acc, part) => {
    if (part.type === "year" || part.type === "month" || part.type === "day") acc[part.type] = Number(part.value);
    return acc;
  }, {});

  if (!parts.year || !parts.month || !parts.day) return titleCase(day);
  const baseUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const baseWeekday = new Date(baseUtc).getUTCDay();
  const daysUntil = (weekday - baseWeekday + 7) % 7;
  const target = new Date(baseUtc + daysUntil * 24 * 60 * 60 * 1000);
  return `${titleCase(WEEKDAYS[weekday])}, ${MONTHS[target.getUTCMonth()]} ${target.getUTCDate()}`;
}

function payloadTimestamp(payload: AgentPhonePayload): Date | null {
  const data = asRecord(payload.data);
  const value = payload.timestamp || firstString(data, ["endedAt", "startedAt", "createdAt"]);
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
