// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { getMoves, setMoveAnswer } from "../lib/desk";
import { SCHEMA, putMove, listMoves, pendingAnswers, answerMove, handleMove, closeMove } from "../scripts/pub-status-lib.mjs";
import { dashboardUrl } from "../scripts/pub-status-store.mjs";
import { POST, OPTIONS } from "../app/api/desk/moves/route";
import { vi } from "vitest";

let db: Database.Database;
vi.mock("@/lib/db", () => ({ db: () => db }));

const mon = new Date("2026-09-28T09:00:00-04:00").getTime();
const tue = new Date("2026-09-29T08:00:00-04:00").getTime();
const wed = new Date("2026-09-30T08:00:00-04:00").getTime();

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(SCHEMA);
  db.prepare("INSERT INTO pub_meta (key, value) VALUES ('desk_token', 'right-token')").run();
  putMove(db, { key: "weekend-carousel", title: "One weekend roundup post", owner: "claude", plan: "First one goes out Wed Sep 30", due: "2026-09-30" }, mon);
  putMove(db, { key: "venue-notes", title: "Send the first venue notes", owner: "andy", due: "2026-10-02" }, mon);
});

describe("moves", () => {
  it("opens with the day it was first raised and keeps it when reworded", () => {
    putMove(db, { key: "venue-notes", title: "Send the first venue notes (Ijams first)", owner: "andy" }, wed);
    const m = listMoves(db).find((x) => x.key === "venue-notes")!;
    expect(m.opened).toBe("2026-09-28");
    expect(m.title).toMatch(/Ijams first/);
  });

  it("refuses a key that isn't a plain slug, and an owner that isn't one of the two", () => {
    expect(() => putMove(db, { key: "A16", title: "x", owner: "claude" })).toThrow(/slug/);
    expect(() => putMove(db, { key: "ok-key", title: "x", owner: "pipeline" as never })).toThrow(/owner/);
  });

  it("takes go or no on Claude's moves and done or later on Andy's", () => {
    expect(answerMove(db, "weekend-carousel", "no", null, tue)).toBe("ok");
    expect(answerMove(db, "weekend-carousel", "done", null, tue)).toBe("bad-answer");
    expect(answerMove(db, "venue-notes", "done", null, tue)).toBe("ok");
    expect(answerMove(db, "venue-notes", "go", null, tue)).toBe("bad-answer");
    expect(answerMove(db, "nothing-here", "go", null, tue)).toBe("unknown-move");
  });

  it("takes a note on its own, and keeps the earlier answer when a note follows it", () => {
    expect(answerMove(db, "weekend-carousel", null, null, tue)).toBe("bad-answer");
    expect(answerMove(db, "weekend-carousel", "go", null, tue)).toBe("ok");
    expect(answerMove(db, "weekend-carousel", null, "but keep the episode card too", wed)).toBe("ok");
    const m = listMoves(db).find((x) => x.key === "weekend-carousel")!;
    expect(m.answer).toBe("go");
    expect(m.note).toBe("but keep the episode card too");
  });

  it("lists an answer as waiting until a run handles it, and again if he answers a second time", () => {
    expect(pendingAnswers(db)).toHaveLength(0);
    answerMove(db, "weekend-carousel", "no", "not this week", tue);
    expect(pendingAnswers(db).map((m) => m.key)).toEqual(["weekend-carousel"]);
    handleMove(db, "weekend-carousel", "pulled from the No. 16 queue", tue + 60_000);
    expect(pendingAnswers(db)).toHaveLength(0);
    answerMove(db, "weekend-carousel", "go", "changed my mind", wed);
    expect(pendingAnswers(db).map((m) => m.key)).toEqual(["weekend-carousel"]);
  });

  it("drops a closed move from the page and won't take an answer for it", () => {
    closeMove(db, "venue-notes", "Ijams note sent Oct 1", wed);
    expect(listMoves(db).map((m) => m.key)).toEqual(["weekend-carousel"]);
    expect(listMoves(db, { all: true })).toHaveLength(2);
    expect(answerMove(db, "venue-notes", "done", null, wed)).toBe("closed");
  });

  it("shows the page what Andy said but not what the run wrote about handling it", () => {
    setMoveAnswer(db, "weekend-carousel", "go", null);
    handleMove(db, "weekend-carousel", "internal note", Date.now() + 1000);
    const m = getMoves(db).find((x) => x.key === "weekend-carousel")!;
    expect(m).toMatchObject({ answer: "go", handled: true });
    expect(m).not.toHaveProperty("handledNote");
  });
});

describe("the dashboard's address", () => {
  it("carries the key in the fragment, never the query", async () => {
    const url = await dashboardUrl({ db });
    expect(url).toBe("https://note15.com/insta/soknoear#k=right-token");
    expect(new URL(url).search).toBe("");
  });
});

describe("POST /api/desk/moves", () => {
  const call = (body: unknown, origin = "https://note15.com") =>
    POST(new Request("https://soknoear.com/api/desk/moves", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) }));

  it("is not found without the key", async () => {
    expect((await call({ token: "wrong" })).status).toBe(404);
    expect((await call({})).status).toBe(404);
  });

  it("lists the open moves for the key", async () => {
    const r = await call({ token: "right-token" });
    expect(r.status).toBe(200);
    expect((await r.json()).moves.map((m: { key: string }) => m.key)).toEqual(["venue-notes", "weekend-carousel"]);
  });

  it("records an answer and hands back the new state", async () => {
    const r = await call({ token: "right-token", key: "weekend-carousel", answer: "no", note: "  hold it a week " });
    const { moves } = await r.json();
    expect(moves.find((m: { key: string }) => m.key === "weekend-carousel")).toMatchObject({ answer: "no", note: "hold it a week", handled: false });
  });

  it("turns away an answer that doesn't fit, and one that isn't an answer at all", async () => {
    expect((await call({ token: "right-token", key: "venue-notes", answer: "go" })).status).toBe(400);
    expect((await call({ token: "right-token", key: "venue-notes", answer: "delete everything" })).status).toBe(400);
    expect((await call({ token: "right-token", key: "nope", answer: "go" })).status).toBe(404);
  });

  it("answers note15.com cross-origin and nobody else", async () => {
    expect((await call({ token: "right-token" })).headers.get("Access-Control-Allow-Origin")).toBe("https://note15.com");
    expect((await call({ token: "right-token" }, "https://example.com")).headers.get("Access-Control-Allow-Origin")).toBeNull();
    const pre = OPTIONS(new Request("https://soknoear.com/api/desk/moves", { method: "OPTIONS", headers: { Origin: "https://note15.com" } }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Methods")).toMatch(/POST/);
  });
});
