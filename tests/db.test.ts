import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { openDb, insertSubmission, insertSubscriber, subscribeToList, listMembers } from "@/lib/db";

function tmp() { return path.join(os.tmpdir(), `ear-${Math.random().toString(36).slice(2)}.db`); }

describe("db", () => {
  it("creates tables and inserts a submission", () => {
    const f = tmp(); const db = openDb(f);
    const id = insertSubmission(db, { headline: "H", details: "D", url: "", dates: "", contact: "" });
    expect(id).toBeGreaterThan(0);
    const row = db.prepare("SELECT headline FROM submissions WHERE id=?").get(id) as any;
    expect(row.headline).toBe("H");
    fs.rmSync(f, { force: true });
  });
  it("dedupes subscribers by email", () => {
    const db = openDb(tmp());
    insertSubscriber(db, "a@b.com");
    insertSubscriber(db, "a@b.com");
    const n = (db.prepare("SELECT COUNT(*) c FROM subscribers").get() as any).c;
    expect(n).toBe(1);
  });
  it("two lists: an Ear subscriber can also join dsparty, and each list reads separately", () => {
    const db = openDb(tmp());
    // Ear signup
    const a = subscribeToList(db, "neighbor@b.com", "ear", "ear-sidebar");
    expect(a).toEqual({ newSubscriber: true, newToList: true });
    // same person joins the party list from the /party form — noted, not duplicated
    const b = subscribeToList(db, "neighbor@b.com", "dsparty", "dsparty-page");
    expect(b).toEqual({ newSubscriber: false, newToList: true });
    // repeat party signup is a no-op
    expect(subscribeToList(db, "neighbor@b.com", "dsparty", "dsparty-page").newToList).toBe(false);
    // a party-only person exists too
    subscribeToList(db, "doer@b.com", "dsparty", "dsparty-page");
    expect(listMembers(db, "ear")).toEqual(["neighbor@b.com"]);
    expect(listMembers(db, "dsparty")).toEqual(["neighbor@b.com", "doer@b.com"]);
    // source is recorded per membership
    const src = db.prepare("SELECT source FROM subscriber_lists WHERE email='neighbor@b.com' AND list='dsparty'").get() as any;
    expect(src.source).toBe("dsparty-page");
  });
  it("backfill: pre-lists subscribers land on 'ear' on reopen; dsparty-only members are not swept in", () => {
    const f = tmp();
    let db = openDb(f);
    db.prepare("INSERT INTO subscriber_lists (email, list, source) VALUES ('doer@b.com','dsparty','dsparty-page')").run();
    insertSubscriber(db, "doer@b.com");
    insertSubscriber(db, "oldtimer@b.com");
    db.prepare("DELETE FROM subscriber_lists WHERE email='oldtimer@b.com'").run(); // simulate pre-migration row
    db.close();
    db = openDb(f); // reopen triggers backfill
    expect(listMembers(db, "ear")).toEqual(["oldtimer@b.com"]);
    expect(listMembers(db, "dsparty")).toEqual(["doer@b.com"]);
    fs.rmSync(f, { force: true });
  });
});
