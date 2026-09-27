// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { getDeskWeek, isDeskToken, setDeskMark, isWeek } from "../lib/desk";
import { deriveWeek, SCHEMA } from "../scripts/pub-status-lib.mjs";
import { sync, mark, deskUrl, gatherFacts } from "../scripts/pub-status-store.mjs";

const now = new Date("2026-09-25T12:00:00-04:00").getTime();
const episode = { slug: "2026-09-23", date: "2026-09-23", number: 15, shortDate: "Sep 24–27", feature: { id: "jam", title: "End of summer jam" }, stories: [] };
const snapshot = () => deriveWeek({
  week: "2026-09-23", now, episode, draft: null, hasAudio: true, igAssets: 3,
  queue: { approved: true, posts: [{ id: "jam", title: "Jam", postAt: "2026-09-26T16:00:00-04:00", status: "pending", tags: [] }] },
  nightlife: { weekend: "Sep 24–27", updated: "2026-09-22" }, reviews: [], venues: [], venueLog: {},
  venueDrafts: { kerns: { key: "kerns", name: "Kern's Food Hall", action: "draft", to: "events@kernsbakery.com", lastDay: "2026-09-26" } },
});

let db: Database.Database;
beforeEach(() => {
  db = new Database(":memory:");
  db.exec(SCHEMA);
  db.prepare("INSERT INTO pub_weeks (week, snapshot, synced_at) VALUES (?,?,?)").run("2026-09-23", JSON.stringify(snapshot()), new Date(now).toISOString());
  db.prepare("INSERT INTO pub_meta (key, value) VALUES ('desk_token', 'right-token')").run();
});

describe("the desk's address", () => {
  it("opens only for the exact token", () => {
    expect(isDeskToken(db, "right-token")).toBe(true);
    expect(isDeskToken(db, "right-tokem")).toBe(false);
    expect(isDeskToken(db, "right")).toBe(false);
    expect(isDeskToken(db, "")).toBe(false);
  });
  it("stays shut when no token was ever issued", () => {
    const fresh = new Database(":memory:");
    expect(isDeskToken(fresh, "anything")).toBe(false);
  });
  it("only takes real dates for a week", () => {
    expect(isWeek("2026-09-23")).toBe(true);
    expect(isWeek("2026-9-23")).toBe(false);
    expect(isWeek("'; DROP TABLE pub_marks; --")).toBe(false);
    expect(isWeek(undefined)).toBe(false);
  });
});

describe("getDeskWeek", () => {
  it("serves the synced week, whichever day of it you ask for", () => {
    const w = getDeskWeek(db, "2026-09-27", now);
    expect(w).toMatchObject({ week: "2026-09-23", number: 15, stage: "published", prev: "2026-09-16", next: "2026-09-30", isThisWeek: true });
    expect(w.syncedAt).toBeTruthy();
  });
  it("defaults to the current week", () => {
    expect(getDeskWeek(db, undefined, now).week).toBe("2026-09-23");
  });
  it("shows the bare plan for a week nobody has synced", () => {
    const w = getDeskWeek(db, "2026-10-14", now);
    expect(w).toMatchObject({ week: "2026-10-14", stage: "not-started", syncedAt: null, isThisWeek: false, done: 0 });
    expect(w.total).toBeGreaterThan(10);
  });
});

describe("setDeskMark — Andy's clicks", () => {
  const item = (id: string) => getDeskWeek(db, "2026-09-23", now).days.flatMap((d) => d.items).find((i) => i.id === id)!;

  it("ticks and un-ticks a box that is his to tick", () => {
    expect(setDeskMark(db, "2026-09-23", "venue-sent:kerns", true)).toBe("ok");
    expect(item("venue-sent:kerns")).toMatchObject({ done: true, markedBy: "andy", locked: false });
    expect(setDeskMark(db, "2026-09-23", "venue-sent:kerns", false)).toBe("ok");
    expect(item("venue-sent:kerns").done).toBe(false);
  });
  it("refuses to touch the pipeline's evidence", () => {
    expect(setDeskMark(db, "2026-09-23", "site-live", false)).toBe("locked");
    expect(setDeskMark(db, "2026-09-23", "ig-post:jam", true)).toBe("locked");
    expect(item("ig-post:jam").done).toBe(false);
  });
  it("refuses a task that isn't in the week's plan", () => {
    expect(setDeskMark(db, "2026-09-23", "launch-rocket", true)).toBe("unknown-task");
    expect(db.prepare("SELECT COUNT(*) n FROM pub_marks").get()).toEqual({ n: 0 });
  });
  it("keeps a pipeline note when Andy ticks the same box", () => {
    db.prepare("INSERT INTO pub_marks (week, task, done, note, by, at) VALUES (?,?,?,?,?,?)").run("2026-09-23", "newsletter", 0, "preview sent to Andy", "pipeline", "2026-09-23T15:00:00Z");
    setDeskMark(db, "2026-09-23", "newsletter", true);
    expect(db.prepare("SELECT done, note, by FROM pub_marks WHERE task = 'newsletter'").get()).toEqual({ done: 1, note: "preview sent to Andy", by: "andy" });
  });
});

describe("the store, against a repo on disk", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "desk-"));
  const put = (rel: string, body: unknown) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body)); };
  put("content/episodes/2026-09-16.json", { ...episode, slug: "2026-09-16", number: 14 });
  put("content/episodes/2026-09-23.json", { ...episode, social: {}, feature: { id: "jam", title: "End of summer jam", facts: [{ label: "Where", value: "Kern's, 2201 Kern's Rising Way" }] } });
  put("content/contacts.json", { contacts: { kerns: { name: "Kern's Food Hall", match: ["Kern's"], email: "events@kernsbakery.com", introduced: null } } });
  put("content/nightlife.json", { weekend: "Sep 24–27", updated: "2026-09-22" });
  put("content/ig-queue/2026-09-23.json", { approved: true, posts: [{ id: "jam", title: "Jam", postAt: "2026-09-26T16:00:00-04:00", status: "posted", tags: [] }] });
  put("public/audio/2026-09-23.mp3", "x");
  put("public/assets/ig/2026-09-23/jam.jpg", "x");
  put("docs/ig-reviews/2026-09-21.md", "# review");

  it("finds the week's episode, its venues, and everything around it", () => {
    const f = gatherFacts(root, "2026-09-23", now);
    expect(f.episode.number).toBe(15);
    expect(f).toMatchObject({ hasAudio: true, igAssets: 1, reviews: ["2026-09-21"], venueDrafts: null });
    expect(f.venues).toEqual([{ key: "kerns", name: "Kern's Food Hall", introduced: null, to: "events@kernsbakery.com" }]);
  });
  it("numbers a week that has no draft yet from the last episode", () => {
    expect(gatherFacts(root, "2026-09-30", now)).toMatchObject({ episode: null, draft: null, expectedNumber: 16 });
    expect(gatherFacts(root, "2026-10-07", now).expectedNumber).toBe(17);
  });
  it("syncs, marks and hands out one stable address", async () => {
    const store = new Database(":memory:");
    store.exec(SCHEMA);
    const [w] = await sync({ root, weeks: ["2026-09-23"], now, db: store });
    expect(w.stage).toBe("published");
    await mark({ date: "2026-09-25", task: "newsletter", note: "sent 7 of 7", db: store });
    const merged = getDeskWeek(store, "2026-09-23", now);
    expect(merged.days.flatMap((d) => d.items).find((i) => i.id === "newsletter")).toMatchObject({ done: true, detail: "sent 7 of 7" });
    expect(merged.days.flatMap((d) => d.items).find((i) => i.id === "ig-post:jam")!.done).toBe(true);
    const url = await deskUrl({ db: store });
    expect(url).toMatch(/^https:\/\/soknoear\.com\/desk\/[\w-]{20,}$/);
    expect(await deskUrl({ db: store })).toBe(url);
    expect(isDeskToken(store, url.split("/").pop()!)).toBe(true);
  });
});
