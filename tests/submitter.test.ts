import { describe, it, expect, vi, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";

vi.mock("@/lib/mail", () => ({
  sendSubmissionEmail: vi.fn(async () => {}),
  sendSubscriberEmail: vi.fn(async () => {}),
  sendStoryDraftEmail: vi.fn(async () => {}),
  sendDraftLinkEmail: vi.fn(async () => {}),
  sendDraftCommentEmail: vi.fn(async () => {}),
  sendSubmitterRegistrationEmail: vi.fn(async () => {}),
}));

beforeEach(() => {
  process.env.SQLITE_PATH = path.join(os.tmpdir(), `submitter-${Math.random()}.db`);
  delete process.env.OPENAI_API_KEY;
  vi.resetModules();
  vi.clearAllMocks();
});

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("verified submitter flow", () => {
  it("registration retro-matches pending drafts by phone and emails review links", async () => {
    const { db, insertStoryDraft } = await import("@/lib/db");
    const { sendDraftLinkEmail } = await import("@/lib/mail");
    insertStoryDraft(db(), {
      submissionId: null, intakeId: 1, source: "phone",
      title: "Trivia night at the Landing",
      draftJson: JSON.stringify({ title: "Trivia night at the Landing" }),
      questionsJson: "[]",
      token: "tok_retro_1",
      contact: "AgentPhone caller +1 (310) 292-4925",
      contactPhone: "3102924925",
      contactEmail: "",
    });

    const { POST } = await import("@/app/api/submitter/route");
    const res = await POST(jsonReq("http://x/api/submitter", { name: "Pat Caller", phone: "310-292-4925", email: "pat@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.linkedDrafts).toBe(1);
    expect(sendDraftLinkEmail).toHaveBeenCalledWith("pat@example.com", expect.objectContaining({
      draftUrl: expect.stringContaining("/draft/tok_retro_1"),
    }));
    const sent = db().prepare("SELECT link_sent_to FROM story_drafts WHERE token = 'tok_retro_1'").get() as { link_sent_to: string };
    expect(sent.link_sent_to).toBe("pat@example.com");
  });

  it("rejects registration without a valid email; honeypot pretends success", async () => {
    const { POST } = await import("@/app/api/submitter/route");
    expect((await POST(jsonReq("http://x", { name: "A", email: "nope" }))).status).toBe(400);
    const bot = await POST(jsonReq("http://x", { name: "A", email: "a@b.com", company: "spam" }));
    expect(bot.status).toBe(200);
    const { db } = await import("@/lib/db");
    expect((db().prepare("SELECT COUNT(*) c FROM submitter_profiles").get() as { c: number }).c).toBe(0);
  });

  it("new drafts from a registered contact get the review link at intake time", async () => {
    const { db, upsertSubmitterProfile } = await import("@/lib/db");
    const { createAndNotifyStoryDraft } = await import("@/lib/story-drafter");
    const { sendDraftLinkEmail, sendStoryDraftEmail } = await import("@/lib/mail");
    upsertSubmitterProfile(db(), { name: "Gill", phone: "865-555-0100", email: "gill@example.com" });

    const id = await createAndNotifyStoryDraft(db(), {
      source: "phone", intakeId: 9,
      headline: "Cornhole league at the Garage",
      details: "Venue: Southside Garage",
      contact: "AgentPhone caller +18655550100",
    });

    expect(id).toEqual(expect.any(Number));
    expect(sendDraftLinkEmail).toHaveBeenCalledTimes(1);
    expect(sendStoryDraftEmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sentTo: "gill@example.com" }));
  });

  it("stores a comment for a valid token, 404s an unknown one", async () => {
    const { db, insertStoryDraft } = await import("@/lib/db");
    insertStoryDraft(db(), {
      submissionId: null, intakeId: null, source: "form",
      title: "Bake sale on Sevier",
      draftJson: JSON.stringify({ title: "Bake sale on Sevier" }),
      questionsJson: "[]",
      token: "tok_comment_1",
    });

    const { POST } = await import("@/app/api/draft-comment/route");
    const { sendDraftCommentEmail } = await import("@/lib/mail");
    const ok = await POST(jsonReq("http://x/api/draft-comment", { token: "tok_comment_1", name: "Bea", comment: "It's 10 AM, not 11." }));
    expect(ok.status).toBe(200);
    expect(sendDraftCommentEmail).toHaveBeenCalledTimes(1);
    const row = db().prepare("SELECT comment FROM draft_comments").get() as { comment: string };
    expect(row.comment).toContain("10 AM");
    expect((db().prepare("SELECT status FROM story_drafts WHERE token='tok_comment_1'").get() as { status: string }).status).toBe("commented");

    expect((await POST(jsonReq("http://x", { token: "tok_wrong", comment: "hi" }))).status).toBe(404);
  });
});
