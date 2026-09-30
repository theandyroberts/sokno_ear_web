// The publishing desk, app side: read a week's snapshot and marks from the DB the
// pipeline writes to (scripts/pub-status-store.mjs), and record Andy's own ticks.
// The app never derives anything from files — it serves from a release snapshot
// and can't see the live queue — so what it shows is what the pipeline last synced.
import crypto from "node:crypto";
import type Database from "better-sqlite3";
import {
  SCHEMA, deriveWeek, mergeMarks, weekOf, todayET, addDays, listMoves, answerMove,
  type MergedWeek, type WeekSnapshot, type DeskMark, type DeskMove, type MoveAnswer,
} from "@/scripts/pub-status-lib.mjs";

const ready = new WeakSet<Database.Database>();
function prepared(d: Database.Database) {
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

/** Constant-time token check. False when no token has been issued yet. */
export function isDeskToken(d: Database.Database, token: string): boolean {
  const row = prepared(d).prepare("SELECT value FROM pub_meta WHERE key = 'desk_token'").get() as { value: string } | undefined;
  if (!row || !token) return false;
  const a = Buffer.from(row.value), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const isWeek = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(Date.parse(s));

export type DeskWeek = MergedWeek & { syncedAt: string | null; prev: string; next: string; isThisWeek: boolean };

/** One week, merged and ready to draw. A week nobody has synced yet shows the bare plan. */
export function getDeskWeek(d: Database.Database, asked?: string, now = Date.now()): DeskWeek {
  const thisWeek = weekOf(todayET(now));
  const week = isWeek(asked) ? weekOf(asked) : thisWeek;
  const row = prepared(d).prepare("SELECT snapshot, synced_at FROM pub_weeks WHERE week = ?").get(week) as { snapshot: string; synced_at: string } | undefined;
  const snapshot: WeekSnapshot = row
    ? JSON.parse(row.snapshot)
    : deriveWeek({ week, now, episode: null, draft: null, hasAudio: false, igAssets: 0, queue: null, nightlife: null, reviews: [], venues: [], venueLog: {}, venueDrafts: null });
  const marks = d.prepare("SELECT task, done, note, by, at FROM pub_marks WHERE week = ?").all(week) as DeskMark[];
  return { ...mergeMarks(snapshot, marks, now), syncedAt: row?.synced_at ?? null, prev: addDays(week, -7), next: addDays(week, 7), isThisWeek: week === thisWeek };
}

/** Andy ticks or un-ticks a box. Only tasks in that week's plan, and never pipeline evidence. */
export function setDeskMark(d: Database.Database, week: string, task: string, done: boolean): "ok" | "unknown-task" | "locked" {
  const w = getDeskWeek(d, week);
  const item = [...w.days.flatMap((x) => x.items), ...w.asks].find((i) => i.id === task);
  if (!item) return "unknown-task";
  if (item.locked) return "locked";
  if (done) {
    d.prepare(`INSERT INTO pub_marks (week, task, done, note, by, at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(week, task) DO UPDATE SET done = 1, by = excluded.by, at = excluded.at`)
      .run(w.week, task, 1, null, "andy", new Date().toISOString());
  } else {
    d.prepare("DELETE FROM pub_marks WHERE week = ? AND task = ?").run(w.week, task);
  }
  return "ok";
}

/** What the dashboard is allowed to see of a move: no handling notes, nothing closed. */
export type PublicMove = Pick<DeskMove, "key" | "title" | "owner" | "plan" | "due" | "opened" | "answer" | "note" | "answeredAt"> & { handled: boolean };

export function getMoves(d: Database.Database): PublicMove[] {
  return listMoves(prepared(d)).map((m) => ({
    key: m.key, title: m.title, owner: m.owner, plan: m.plan, due: m.due, opened: m.opened,
    answer: m.answer, note: m.note, answeredAt: m.answeredAt,
    handled: Boolean(m.handledAt && m.answeredAt && m.handledAt >= m.answeredAt),
  }));
}

/** Andy answers a move from the page he reads. */
export function setMoveAnswer(d: Database.Database, key: string, answer: MoveAnswer | null, note: string | null) {
  return answerMove(prepared(d), key, answer, note);
}
