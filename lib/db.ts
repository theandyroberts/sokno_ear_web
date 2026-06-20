import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Submission = { headline: string; details: string; url?: string; dates?: string; contact?: string };

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
