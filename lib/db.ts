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
  `);
  return db;
}

let _db: Database.Database | null = null;
export function db() { return (_db ??= openDb()); }

export function insertSubmission(d: Database.Database, s: Submission): number {
  const r = d.prepare(
    "INSERT INTO submissions (headline, details, url, dates, contact) VALUES (?,?,?,?,?)"
  ).run(s.headline, s.details, s.url ?? "", s.dates ?? "", s.contact ?? "");
  return Number(r.lastInsertRowid);
}

export function insertSubscriber(d: Database.Database, email: string): void {
  d.prepare("INSERT OR IGNORE INTO subscribers (email) VALUES (?)").run(email);
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
