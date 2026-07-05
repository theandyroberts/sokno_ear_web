import type { AgentPhonePayload, ListingDraft } from "./agentphone";
import type { Submission } from "./db";

type ListingExtraction = {
  listingType: "event" | "drink_special" | "food_special" | "special" | "rumor" | "unknown";
  title: string;
  venueName: string;
  venueLocation: string;
  offer: string;
  scheduleText: string;
  dayOfWeek: string;
  date: string;
  startTime: string;
  endTime: string;
  audience: string;
  promoLine: string;
  summary: string;
  sourceContact: string;
  missingFields: string[];
  confidence: number;
};

const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "listingType",
    "title",
    "venueName",
    "venueLocation",
    "offer",
    "scheduleText",
    "dayOfWeek",
    "date",
    "startTime",
    "endTime",
    "audience",
    "promoLine",
    "summary",
    "sourceContact",
    "missingFields",
    "confidence",
  ],
  properties: {
    listingType: { type: "string", enum: ["event", "drink_special", "food_special", "special", "rumor", "unknown"] },
    title: { type: "string" },
    venueName: { type: "string" },
    venueLocation: { type: "string" },
    offer: { type: "string" },
    scheduleText: { type: "string" },
    dayOfWeek: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD when known; empty string when unknown." },
    startTime: { type: "string" },
    endTime: { type: "string" },
    audience: { type: "string" },
    promoLine: { type: "string" },
    summary: { type: "string" },
    sourceContact: { type: "string" },
    missingFields: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

export async function extractListingWithOpenAI(
  payload: AgentPhonePayload,
  fallback: ListingDraft
): Promise<ListingDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || payload.event !== "agent.call_ended" || !fallback.transcriptText.trim()) return fallback;

  try {
    const extraction = await requestStructuredExtraction(apiKey, payload, fallback);
    return extractionToDraft(extraction, fallback);
  } catch (err) {
    console.error("[agentphone] OpenAI listing extraction failed", err);
    return fallback;
  }
}

async function requestStructuredExtraction(
  apiKey: string,
  payload: AgentPhonePayload,
  fallback: ListingDraft
): Promise<ListingExtraction> {
  const model = process.env.OPENAI_EXTRACTION_MODEL || "gpt-5.4-nano";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "none" },
      text: {
        format: {
          type: "json_schema",
          name: "sokno_ear_listing",
          strict: true,
          schema: EXTRACTION_SCHEMA,
        },
      },
      input: [
        {
          role: "system",
          content: [
            "Extract one SoKno Ear board listing from an AgentPhone call transcript.",
            "Return only facts supported by the transcript or AgentPhone metadata.",
            "Do not guess venue names, dates, prices, or times.",
            "Use America/New_York for relative dates. If the caller says a weekday, resolve it to the next matching calendar date on or after the local call date.",
            "Normalize obvious speech-to-text errors only when the question context proves the meaning, such as 'rinse till nine PM' after an end-time question meaning 'runs till 9 PM'.",
            "Do not treat a time like noon as a venue. Do not treat an end time as a promo line.",
            "For a special, required fields are listingType, venueName, offer, day/date or scheduleText, and start/end time or all-night duration.",
            "For an event, required fields are listingType, title, venueName, and day/date or scheduleText.",
            "Use empty strings for unknown scalar fields and put missing required fields in missingFields.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            callTimestampUtc: payload.timestamp || "",
            callLocalDate: localDateForPayload(payload),
            agentSummary: fallback.summary,
            currentFallback: {
              listingType: fallback.listingType,
              title: fallback.title,
              venue: fallback.venue,
              offer: fallback.offer,
              schedule: fallback.schedule,
              promoLine: fallback.promoLine,
            },
            transcript: fallback.transcriptText,
            payloadData: payload.data ?? {},
          }),
        },
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);

  const text = extractOutputText(body);
  if (!text) throw new Error("OpenAI response did not include output text");
  return validateExtraction(JSON.parse(text));
}

function extractOutputText(body: unknown): string {
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const part of content) {
      const partRecord = part && typeof part === "object" ? part as Record<string, unknown> : {};
      if (typeof partRecord.text === "string") return partRecord.text;
    }
  }
  return "";
}

function validateExtraction(value: unknown): ListingExtraction {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const listingType = String(record.listingType ?? "unknown") as ListingExtraction["listingType"];
  const allowed = new Set(["event", "drink_special", "food_special", "special", "rumor", "unknown"]);
  return {
    listingType: allowed.has(listingType) ? listingType : "unknown",
    title: str(record.title),
    venueName: str(record.venueName),
    venueLocation: str(record.venueLocation),
    offer: str(record.offer),
    scheduleText: str(record.scheduleText),
    dayOfWeek: str(record.dayOfWeek),
    date: str(record.date),
    startTime: str(record.startTime),
    endTime: str(record.endTime),
    audience: str(record.audience),
    promoLine: str(record.promoLine),
    summary: str(record.summary),
    sourceContact: str(record.sourceContact),
    missingFields: Array.isArray(record.missingFields) ? record.missingFields.map(str).filter(Boolean) : [],
    confidence: typeof record.confidence === "number" ? Math.max(0, Math.min(1, record.confidence)) : 0,
  };
}

function extractionToDraft(extraction: ListingExtraction, fallback: ListingDraft): ListingDraft {
  const venue = [extraction.venueName, extraction.venueLocation].filter(Boolean).join(" on ");
  const schedule = buildSchedule(extraction);
  const title = extraction.title || extraction.promoLine || buildTitle(extraction, venue);
  const missingFields = extraction.missingFields.length
    ? extraction.missingFields
    : missingListingFields(extraction, title, venue, schedule);
  const ready = missingFields.length === 0 && extraction.listingType !== "unknown";
  const listingStatus = ready ? "ready" : "needs_review";
  const submission = ready ? buildSubmissionFromExtraction(extraction, fallback, { title, venue, schedule }) : undefined;

  return {
    ...fallback,
    ready,
    ignored: false,
    listingStatus,
    missingFields,
    listingType: extraction.listingType === "rumor" ? "unknown" : extraction.listingType,
    title,
    venue,
    offer: extraction.offer,
    schedule,
    audience: extraction.audience,
    promoLine: extraction.promoLine,
    contact: extraction.sourceContact || fallback.contact,
    summary: extraction.summary || fallback.summary,
    submission,
  };
}

function buildSubmissionFromExtraction(
  extraction: ListingExtraction,
  fallback: ListingDraft,
  fields: { title: string; venue: string; schedule: string }
): Submission {
  const details = [
    `Source: AgentPhone${fallback.callId ? ` call ${fallback.callId}` : ""}`,
    "Extraction: OpenAI structured output",
    `Type: ${extraction.listingType.replace("_", " ")}`,
    fields.venue ? `Venue: ${fields.venue}` : "",
    extraction.offer ? `Offer: ${extraction.offer}` : "",
    fields.schedule ? `Schedule: ${fields.schedule}` : "",
    extraction.audience ? `Audience: ${extraction.audience}` : "",
    extraction.promoLine ? `Promo line: ${extraction.promoLine}` : "",
    extraction.summary ? `Call summary: ${extraction.summary}` : "",
    fallback.transcriptText ? `Transcript:\n${fallback.transcriptText}` : "",
  ].filter(Boolean).join("\n");

  return {
    headline: fields.title.slice(0, 300),
    details: details.slice(0, 5000),
    dates: fields.schedule.slice(0, 200),
    contact: (extraction.sourceContact || fallback.contact)
      ? `AgentPhone caller ${extraction.sourceContact || fallback.contact}`.slice(0, 300)
      : "AgentPhone caller",
  };
}

function buildSchedule(extraction: ListingExtraction): string {
  if (extraction.scheduleText) return extraction.scheduleText;
  const day = [extraction.dayOfWeek, extraction.date].filter(Boolean).join(", ");
  if (day && extraction.startTime && extraction.endTime) return `${day}, ${extraction.startTime} to ${extraction.endTime}`;
  if (day && extraction.startTime) return `${day}, starting at ${extraction.startTime}`;
  if (day && extraction.endTime) return `${day}, until ${extraction.endTime}`;
  return day;
}

function buildTitle(extraction: ListingExtraction, venue: string): string {
  if (extraction.listingType === "event" && extraction.title) return extraction.title;
  if (extraction.offer && venue) return `${venue}: ${extraction.offer}`;
  return extraction.offer || venue || "";
}

function missingListingFields(extraction: ListingExtraction, title: string, venue: string, schedule: string): string[] {
  const missing: string[] = [];
  if (extraction.listingType === "unknown") missing.push("listing type");
  if (!venue) missing.push("venue");
  if (extraction.listingType === "event" && !title) missing.push("event title");
  if (extraction.listingType !== "event" && !extraction.offer && !title) missing.push("offer or promo line");
  if (!schedule) missing.push(extraction.listingType === "event" ? "date/time" : "day/time");
  return missing;
}

function localDateForPayload(payload: AgentPhonePayload): string {
  const value = payload.timestamp || str(payload.data?.endedAt) || str(payload.data?.startedAt);
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(Number.isFinite(date.getTime()) ? date : new Date());
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}
