import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { extractEmail, findSubmitterForContact, insertStoryDraft, markDraftLinkSent, normalizePhone } from "./db";
import { sendDraftLinkEmail, sendStoryDraftEmail } from "./mail";

const SITE = "https://soknoear.com";

// Drafts an Ear story at intake time (form submit or AgentPhone call) so follow-up
// questions go out while the source is warm. OpenAI writes the draft; a plain
// template fallback keeps intake working when the key/API is unavailable.

export type StoryDraftInput = {
  source: "form" | "phone";
  submissionId?: number | null;
  intakeId?: number | null;
  headline: string;
  details: string;
  url?: string;
  dates?: string;
  contact?: string;
  summary?: string;
  transcript?: string;
  missingFields?: string[];
};

export type StoryDraft = {
  title: string;
  deck: string;
  label: string;
  days: string[];
  facts: { label: string; value: string }[];
  paragraphs: string[];
  followUpQuestions: string[];
  confidence: number;
};

const PILLS = ["Old Sevier", "Kern's", "Ijams Park", "Island Home", "Suttree Landing", "Urban Wilderness", "SoKno"];

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "deck", "label", "days", "facts", "paragraphs", "followUpQuestions", "confidence"],
  properties: {
    title: { type: "string", description: "Headline in the Ear's voice; sentence case." },
    deck: { type: "string", description: "One-sentence deck; empty string if too little is known." },
    label: { type: "string", enum: PILLS, description: "Location pill; use SoKno when the neighborhood is unknown." },
    days: { type: "array", items: { type: "string", enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] } },
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: { label: { type: "string" }, value: { type: "string" } },
      },
    },
    paragraphs: { type: "array", items: { type: "string" }, description: "1-3 short body paragraphs." },
    followUpQuestions: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

/** Generate a draft, store it, email Andy — and, when the contact matches a verified
 * submitter, email them the /draft/<token> review link. Never throws. */
export async function createAndNotifyStoryDraft(store: Database.Database, input: StoryDraftInput): Promise<number | null> {
  try {
    const draft = await generateStoryDraft(input);
    const token = crypto.randomBytes(12).toString("hex");
    const contactEmail = extractEmail(input.contact);
    const contactPhone = normalizePhone(input.contact);
    const id = insertStoryDraft(store, {
      submissionId: input.submissionId ?? null,
      intakeId: input.intakeId ?? null,
      source: input.source,
      title: draft.title,
      draftJson: JSON.stringify(draft),
      questionsJson: JSON.stringify(draft.followUpQuestions),
      token,
      contact: input.contact,
      contactPhone,
      contactEmail,
    });
    const draftUrl = `${SITE}/draft/${token}`;

    // Verified-submitter match: only registered folks get the review link;
    // otherwise the city desk follows up. Publishing is always the desk's call.
    let sentTo: string | undefined;
    const match = findSubmitterForContact(store, { phone: input.contact, email: contactEmail });
    if (match) {
      await sendDraftLinkEmail(match.email, { name: match.name, title: draft.title, draftUrl });
      markDraftLinkSent(store, id, match.email);
      sentTo = match.email;
    }

    await sendStoryDraftEmail(draft, {
      id, source: input.source, contact: input.contact,
      missingFields: input.missingFields, draftUrl, sentTo,
    });
    return id;
  } catch (err) {
    console.error("[drafter] story draft failed", err);
    return null;
  }
}

export async function generateStoryDraft(input: StoryDraftInput): Promise<StoryDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackDraft(input);
  try {
    return await requestDraft(apiKey, input);
  } catch (err) {
    console.error("[drafter] OpenAI draft failed, using fallback", err);
    return fallbackDraft(input);
  }
}

async function requestDraft(apiKey: string, input: StoryDraftInput): Promise<StoryDraft> {
  const model = process.env.OPENAI_DRAFT_MODEL || process.env.OPENAI_EXTRACTION_MODEL || "gpt-5.4-nano";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning: { effort: "none" },
      text: { format: { type: "json_schema", name: "sokno_ear_story_draft", strict: true, schema: DRAFT_SCHEMA } },
      input: [
        {
          role: "system",
          content: [
            "Draft a short article for The South Knoxville Ear, a weekly neighborhood paper for South Knoxville, TN.",
            "Voice: neighborly, curious, lightly funny, useful, locally fluent — never mean. Sentence-case headline. No emoji.",
            "Use ONLY facts present in the input. Never invent venues, dates, times, prices, or names.",
            "Anything unknown, unverified, or ambiguous goes in followUpQuestions as a concrete question to ask the submitter.",
            "Write 1-3 short paragraphs. Facts strip holds the essentials (When / Where / The deal / Cost etc.).",
            "days: 3-letter day names only when the input states the day(s). label: the neighborhood pill; 'SoKno' when unclear.",
            "Say 'Ijams Park' (never bare 'Ijams'). Kern's = the food-hall pocket; Old Sevier = the Sevier Avenue strip.",
            "If the input reads like speech-to-text, normalize only when context proves the meaning; otherwise ask in followUpQuestions.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            source: input.source,
            headline: input.headline,
            details: input.details,
            url: input.url || "",
            dates: input.dates || "",
            contact: input.contact || "",
            summary: input.summary || "",
            transcript: input.transcript || "",
            knownMissingFields: input.missingFields || [],
          }),
        },
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);
  const text = extractOutputText(body);
  if (!text) throw new Error("OpenAI draft response did not include output text");
  return validateDraft(JSON.parse(text), input);
}

function extractOutputText(body: unknown): string {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const part of content) {
      const partRecord = part && typeof part === "object" ? (part as Record<string, unknown>) : {};
      if (typeof partRecord.text === "string") return partRecord.text;
    }
  }
  return "";
}

function validateDraft(value: unknown, input: StoryDraftInput): StoryDraft {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const days = Array.isArray(record.days) ? record.days.map(str).filter(Boolean) : [];
  const facts = Array.isArray(record.facts)
    ? record.facts
        .map((f) => {
          const fr = f && typeof f === "object" ? (f as Record<string, unknown>) : {};
          return { label: str(fr.label), value: str(fr.value) };
        })
        .filter((f) => f.label && f.value)
    : [];
  const paragraphs = Array.isArray(record.paragraphs) ? record.paragraphs.map(str).filter(Boolean) : [];
  const draft: StoryDraft = {
    title: str(record.title) || input.headline,
    deck: str(record.deck),
    label: PILLS.includes(str(record.label)) ? str(record.label) : "SoKno",
    days,
    facts,
    paragraphs: paragraphs.length ? paragraphs : [input.details].filter(Boolean),
    followUpQuestions: Array.isArray(record.followUpQuestions) ? record.followUpQuestions.map(str).filter(Boolean) : [],
    confidence: typeof record.confidence === "number" ? Math.max(0, Math.min(1, record.confidence)) : 0,
  };
  return draft;
}

function fallbackDraft(input: StoryDraftInput): StoryDraft {
  const questions = (input.missingFields || []).map((f) => `Confirm ${f}.`);
  if (!input.url) questions.push("Is there a link (site, Instagram, ticket page) to source this?");
  return {
    title: input.headline,
    deck: "",
    label: "SoKno",
    days: [],
    facts: [
      input.dates ? { label: "When", value: input.dates } : null,
      input.contact ? { label: "Contact", value: input.contact } : null,
    ].filter(Boolean) as { label: string; value: string }[],
    paragraphs: [input.details].filter(Boolean),
    followUpQuestions: questions,
    confidence: 0,
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}
