import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { openDb, insertSubmission, insertSubscriber } from "@/lib/db";

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
});
