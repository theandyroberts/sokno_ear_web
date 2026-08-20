import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Submission = { headline: string; details: string; url?: string; dates?: string; contact?: string };
export type Contact = { name?: string; email: string; message: string };
export type AgentPhoneIntake = {
  webhookId: string;
  event: string;
  channel?: string;
  agentId?: string;
  callId?: string;
  listingStatus: "ready" | "needs_review" | "ignored";
  missingFields: string[];
  payloadJson: string;
  transcriptText?: string;
  summary?: string;
};

export type StoryDraftRow = {
  submissionId: number | null;
  intakeId: number | null;
  source: "form" | "phone";
  title: string;
  draftJson: string;
  questionsJson: string;
  token: string;
  contact?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export type SubmitterProfile = { name: string; phone?: string; email: string };

/** Last 10 digits of a phone-ish string; "" when it doesn't look like a phone. */
export function normalizePhone(value: string | undefined | null): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : "";
}

/** First email-looking token in a free-text contact field; "" if none. */
export function extractEmail(value: string | undefined | null): string {
  const m = (value ?? "").match(/[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+/);
  return m ? m[0].toLowerCase() : "";
}

export function openDb(file = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "ear.db")) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      headline TEXT NOT NULL, details TEXT NOT NULL,
      url TEXT, dates TEXT, contact TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, email TEXT NOT NULL, message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS agentphone_intakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id TEXT NOT NULL UNIQUE,
      event TEXT NOT NULL,
      channel TEXT,
      agent_id TEXT,
      call_id TEXT,
      listing_status TEXT NOT NULL,
      missing_fields TEXT NOT NULL,
      submission_id INTEGER,
      payload_json TEXT NOT NULL,
      transcript_text TEXT,
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS story_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      intake_id INTEGER,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      title TEXT NOT NULL,
      draft_json TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      token TEXT,
      contact TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      link_sent_to TEXT,
      link_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS submitter_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS draft_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL,
      name TEXT,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriber_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      list TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(email, list)
    );
  `);
  // Columns added after story_drafts first shipped — no-ops on fresh DBs.
  for (const col of ["token TEXT", "contact TEXT", "contact_phone TEXT", "contact_email TEXT", "link_sent_to TEXT", "link_sent_at TEXT"]) {
    try { db.exec(`ALTER TABLE story_drafts ADD COLUMN ${col}`); } catch { /* already present */ }
  }
  // One-time list backfill: everyone who subscribed before lists existed is Ear.
  // Guarded by NOT EXISTS so later dsparty-only members are never swept into 'ear'.
  db.exec(`
    INSERT OR IGNORE INTO subscriber_lists (email, list, source)
    SELECT s.email, 'ear', 'backfill'
    FROM subscribers s
    WHERE NOT EXISTS (SELECT 1 FROM subscriber_lists l WHERE l.email = s.email)
  `);
  return db;
}

export type SubscriberList = "ear" | "dsparty";

let _db: Database.Database | null = null;
export function db() { return (_db ??= openDb()); }

export function insertSubmission(d: Database.Database, s: Submission): number {
  const r = d.prepare(
    "INSERT INTO submissions (headline, details, url, dates, contact) VALUES (?,?,?,?,?)"
  ).run(s.headline, s.details, s.url ?? "", s.dates ?? "", s.contact ?? "");
  return Number(r.lastInsertRowid);
}

/** Returns true when this is a brand-new subscriber (false on repeat signups). */
export function insertSubscriber(d: Database.Database, email: string): boolean {
  const r = d.prepare("INSERT OR IGNORE INTO subscribers (email) VALUES (?)").run(email);
  return r.changes > 0;
}

/** Join a list (creating the master subscriber row if needed). `source` records
 *  which form did it — e.g. 'ear-sidebar', 'dsparty-page'. One person can hold
 *  both 'ear' and 'dsparty' memberships; each is its own row. */
export function subscribeToList(
  d: Database.Database,
  email: string,
  list: SubscriberList,
  source: string
): { newSubscriber: boolean; newToList: boolean } {
  const newSubscriber = insertSubscriber(d, email);
  const r = d.prepare("INSERT OR IGNORE INTO subscriber_lists (email, list, source) VALUES (?, ?, ?)").run(email, list, source);
  return { newSubscriber, newToList: r.changes > 0 };
}

/** Emails on a given list (the weekly blast reads 'ear'; party notices read 'dsparty'). */
export function listMembers(d: Database.Database, list: SubscriberList): string[] {
  return (d.prepare("SELECT email FROM subscriber_lists WHERE list = ? ORDER BY created_at").all(list) as { email: string }[]).map((r) => r.email);
}

export function insertContact(d: Database.Database, c: Contact): number {
  const r = d.prepare("INSERT INTO contacts (name, email, message) VALUES (?,?,?)").run(c.name ?? "", c.email, c.message);
  return Number(r.lastInsertRowid);
}

export function insertAgentPhoneIntake(
  d: Database.Database,
  intake: AgentPhoneIntake
): { id: number; duplicate: boolean; submissionId: number | null } {
  const existing = d.prepare("SELECT id, submission_id FROM agentphone_intakes WHERE webhook_id = ?").get(intake.webhookId) as
    | { id: number; submission_id: number | null }
    | undefined;
  if (existing) return { id: existing.id, duplicate: true, submissionId: existing.submission_id ?? null };

  const r = d.prepare(`
    INSERT INTO agentphone_intakes (
      webhook_id, event, channel, agent_id, call_id, listing_status,
      missing_fields, payload_json, transcript_text, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    intake.webhookId,
    intake.event,
    intake.channel ?? "",
    intake.agentId ?? "",
    intake.callId ?? "",
    intake.listingStatus,
    JSON.stringify(intake.missingFields),
    intake.payloadJson,
    intake.transcriptText ?? "",
    intake.summary ?? ""
  );
  return { id: Number(r.lastInsertRowid), duplicate: false, submissionId: null };
}

export function attachSubmissionToAgentPhoneIntake(d: Database.Database, intakeId: number, submissionId: number): void {
  d.prepare("UPDATE agentphone_intakes SET submission_id = ? WHERE id = ?").run(submissionId, intakeId);
}

export function insertStoryDraft(d: Database.Database, r: StoryDraftRow): number {
  const res = d.prepare(`
    INSERT INTO story_drafts (submission_id, intake_id, source, title, draft_json, questions_json, token, contact, contact_phone, contact_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    r.submissionId, r.intakeId, r.source, r.title, r.draftJson, r.questionsJson,
    r.token, r.contact ?? "", r.contactPhone ?? "", r.contactEmail ?? ""
  );
  return Number(res.lastInsertRowid);
}

export type StoryDraftRecord = {
  id: number;
  source: string;
  status: string;
  title: string;
  draft_json: string;
  questions_json: string;
  token: string;
  contact: string;
  link_sent_to: string | null;
  created_at: string;
};

export function getStoryDraftByToken(d: Database.Database, token: string): StoryDraftRecord | null {
  if (!token) return null;
  return (d.prepare("SELECT id, source, status, title, draft_json, questions_json, token, contact, link_sent_to, created_at FROM story_drafts WHERE token = ?").get(token) as StoryDraftRecord | undefined) ?? null;
}

/** Upsert by email; registering again updates name/phone. */
export function upsertSubmitterProfile(d: Database.Database, p: SubmitterProfile): number {
  const email = p.email.toLowerCase();
  const phone = normalizePhone(p.phone);
  d.prepare(`
    INSERT INTO submitter_profiles (name, phone, email) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone
  `).run(p.name, phone, email);
  return Number((d.prepare("SELECT id FROM submitter_profiles WHERE email = ?").get(email) as { id: number }).id);
}

/** Match a draft's contact (phone and/or email) to a registered submitter. */
export function findSubmitterForContact(
  d: Database.Database,
  contact: { phone?: string; email?: string }
): { name: string; email: string } | null {
  const email = (contact.email ?? "").toLowerCase();
  const phone = normalizePhone(contact.phone);
  if (email) {
    const byEmail = d.prepare("SELECT name, email FROM submitter_profiles WHERE email = ?").get(email) as { name: string; email: string } | undefined;
    if (byEmail) return byEmail;
  }
  if (phone) {
    const byPhone = d.prepare("SELECT name, email FROM submitter_profiles WHERE phone = ?").get(phone) as { name: string; email: string } | undefined;
    if (byPhone) return byPhone;
  }
  return null;
}

/** Drafts not yet shared whose stored contact matches this profile (for retroactive matching at registration). */
export function findPendingDraftsForProfile(
  d: Database.Database,
  profile: { phone?: string; email: string }
): { id: number; title: string; token: string }[] {
  const phone = normalizePhone(profile.phone);
  const email = profile.email.toLowerCase();
  return d.prepare(`
    SELECT id, title, token FROM story_drafts
    WHERE link_sent_at IS NULL AND token IS NOT NULL AND token != ''
      AND (contact_email = ? OR (contact_phone != '' AND contact_phone = ?))
  `).all(email, phone) as { id: number; title: string; token: string }[];
}

export function markDraftLinkSent(d: Database.Database, draftId: number, email: string): void {
  d.prepare("UPDATE story_drafts SET link_sent_to = ?, link_sent_at = datetime('now') WHERE id = ?").run(email, draftId);
}

export function insertDraftComment(d: Database.Database, c: { draftId: number; name?: string; comment: string }): number {
  const r = d.prepare("INSERT INTO draft_comments (draft_id, name, comment) VALUES (?, ?, ?)").run(c.draftId, c.name ?? "", c.comment);
  d.prepare("UPDATE story_drafts SET status = 'commented' WHERE id = ? AND status = 'new'").run(c.draftId);
  return Number(r.lastInsertRowid);
}
