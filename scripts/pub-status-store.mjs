// The publishing desk's store: gathers the week's facts from the repo on the VPS,
// and keeps snapshots + marks in the site's SQLite DB, where the running app can
// read them. (The app serves from a release snapshot and chdirs into it, so it
// can't see content/ig-queue or content/venue-notify directly — the DB is the one
// place both the pipeline and the page can reach.)
//
// Everything a pipeline script calls here is wrapped by `record()` / `syncQuietly()`,
// which never throw: a status page must not be able to break a publish.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { deriveWeek, weekOf, addDays, todayET, SCHEMA } from "./pub-status-lib.mjs";
import { resolveVenues } from "./venue-notify-lib.mjs";

export const DB_PATH = process.env.SQLITE_PATH || "/var/lib/soknoear/ear.db";
export const SITE = "https://soknoear.com";

/** True on the VPS (or anywhere a DB has been pointed at). The Mac forwards over ssh. */
export const hasStore = () => Boolean(process.env.SQLITE_PATH) || fs.existsSync(path.dirname(DB_PATH));

export async function openStore(file = DB_PATH) {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 4000");
  db.exec(SCHEMA);
  return db;
}

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const list = (dir, re) => { try { return fs.readdirSync(dir).filter((f) => re.test(f)); } catch { return []; } };

/** Everything deriveWeek needs for one week, read from the repo at `root`. */
export function gatherFacts(root, week, now = Date.now()) {
  const inWeek = (slug) => slug >= addDays(week, -2) && slug <= addDays(week, 4);
  const pick = (dir) => {
    const f = list(path.join(root, "content", dir), /\.json$/).map((n) => n.replace(".json", "")).filter(inWeek).sort().at(-1);
    return f ? readJson(path.join(root, "content", dir, `${f}.json`)) : null;
  };
  const episode = pick("episodes");
  const draft = episode ? null : pick("drafts");
  const ep = episode ?? draft;
  const slug = ep?.slug ?? null;

  // Before a draft exists, the number is the last published one plus the weeks since.
  const last = list(path.join(root, "content", "episodes"), /\.json$/).sort().at(-1);
  const lastEp = last ? readJson(path.join(root, "content", "episodes", last)) : null;
  const weeksOn = lastEp ? Math.round((new Date(`${week}T12:00:00Z`) - new Date(`${weekOf(lastEp.slug)}T12:00:00Z`)) / (7 * 86400000)) : 0;

  const contacts = readJson(path.join(root, "content", "contacts.json"))?.contacts ?? {};
  const venues = ep
    ? [...resolveVenues(ep, contacts).venues.keys()].map((key) => {
        const c = contacts[key] ?? {};
        return { key, name: c.name ?? key, introduced: c.introduced ?? null, to: c.to ?? c.email ?? null };
      })
    : [];

  return {
    week, now, episode, draft,
    expectedNumber: lastEp?.number && weeksOn > 0 ? lastEp.number + weeksOn : null,
    hasAudio: Boolean(slug && fs.existsSync(path.join(root, "public", "audio", `${slug}.mp3`))),
    igAssets: slug ? list(path.join(root, "public", "assets", "ig", slug), /\.jpe?g$/).length : 0,
    queue: slug ? readJson(path.join(root, "content", "ig-queue", `${slug}.json`)) : null,
    nightlife: readJson(path.join(root, "content", "nightlife.json")),
    reviews: list(path.join(root, "docs", "ig-reviews"), /^\d{4}-\d\d-\d\d\.md$/).map((n) => n.slice(0, 10)),
    venues,
    venueLog: slug ? readJson(path.join(root, "content", "venue-notify", `${slug}.json`)) ?? {} : {},
    venueDrafts: slug ? readJson(path.join(root, "content", "venue-notify", slug, "drafts.json")) : null,
  };
}

/**
 * Re-derive this week and next from the files on disk, and store the snapshots.
 * @param {{root?: string, weeks?: string[], now?: number, db?: any}} [opts]
 */
export async function sync({ root = process.cwd(), weeks, now = Date.now(), db } = {}) {
  const own = !db;
  db ??= await openStore();
  const thisWeek = weekOf(todayET(now));
  const targets = [...new Set(weeks ?? [thisWeek, addDays(thisWeek, 7)])];
  const put = db.prepare("INSERT INTO pub_weeks (week, snapshot, synced_at) VALUES (?,?,?) ON CONFLICT(week) DO UPDATE SET snapshot=excluded.snapshot, synced_at=excluded.synced_at");
  const out = targets.map((week) => {
    const snapshot = deriveWeek(gatherFacts(root, week, now));
    put.run(week, JSON.stringify(snapshot), snapshot.generatedAt);
    return snapshot;
  });
  if (own) db.close();
  return out;
}

/**
 * Record that a task happened (or, with done:false, only leave a note on it).
 * @param {{date?: string, task?: string, done?: boolean, note?: string|null, by?: string, db?: any}} [args]
 */
export async function mark({ date, task, done = true, note = null, by = "pipeline", db } = {}) {
  const own = !db;
  db ??= await openStore();
  const week = weekOf(date ?? todayET());
  db.prepare(`INSERT INTO pub_marks (week, task, done, note, by, at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(week, task) DO UPDATE SET done=excluded.done, note=COALESCE(excluded.note, pub_marks.note), by=excluded.by, at=excluded.at`)
    .run(week, task, done ? 1 : 0, note, by, new Date().toISOString());
  if (own) db.close();
  return week;
}

/** @param {{date?: string, task?: string, db?: any}} [args] */
export async function unmark({ date, task, db } = {}) {
  const own = !db;
  db ??= await openStore();
  const week = weekOf(date ?? todayET());
  db.prepare("DELETE FROM pub_marks WHERE week = ? AND task = ?").run(week, task);
  if (own) db.close();
  return week;
}

/** The desk's address. The token is made once and lives in the DB, not in .env. */
export async function deskUrl(/** @type {{db?: any}} */ { db } = {}) {
  const own = !db;
  db ??= await openStore();
  let row = db.prepare("SELECT value FROM pub_meta WHERE key = 'desk_token'").get();
  if (!row) {
    row = { value: crypto.randomBytes(18).toString("base64url") };
    db.prepare("INSERT INTO pub_meta (key, value) VALUES ('desk_token', ?)").run(row.value);
  }
  if (own) db.close();
  return `${SITE}/desk/${row.value}`;
}

/** Where the Instagram dashboard lives. Public page; the answer buttons need the key. */
export const INSTA_DASHBOARD = "https://note15.com/insta/soknoear";

/**
 * The dashboard's address WITH the key that turns its answer buttons on. The key rides
 * in the fragment, which browsers never send to a server; the page moves it into
 * localStorage and strips it from the address bar. Same secret as the desk's.
 */
export async function dashboardUrl(/** @type {{db?: any}} */ { db } = {}) {
  const desk = await deskUrl({ db });
  return `${INSTA_DASHBOARD}#k=${desk.split("/").pop()}`;
}

// ── For pipeline scripts: never throw, never block ──────────────────────────
export async function record(args) {
  if (!hasStore()) return;
  try { await mark(args); await sync({ weeks: [weekOf(args.date ?? todayET())] }); }
  catch (e) { console.warn(`  (desk: could not record ${args.task} — ${e.message})`); }
}

export async function syncQuietly(opts) {
  if (!hasStore()) return;
  try { await sync(opts); } catch (e) { console.warn(`  (desk: sync failed — ${e.message})`); }
}
