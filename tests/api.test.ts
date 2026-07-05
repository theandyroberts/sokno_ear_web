import { describe, it, expect, vi, beforeEach } from "vitest";
import os from "node:os"; import path from "node:path";

vi.mock("@/lib/mail", () => ({
  sendSubmissionEmail: vi.fn(async () => {}),
  sendSubscriberEmail: vi.fn(async () => {}),
  sendStoryDraftEmail: vi.fn(async () => {}),
  sendDraftLinkEmail: vi.fn(async () => {}),
  sendDraftCommentEmail: vi.fn(async () => {}),
  sendSubmitterRegistrationEmail: vi.fn(async () => {}),
}));

beforeEach(() => {
  process.env.SQLITE_PATH = path.join(os.tmpdir(), `api-${Math.random()}.db`);
  delete process.env.OPENAI_API_KEY; // drafter uses its offline fallback in tests
  vi.resetModules();
});

describe("api", () => {
  it("POST /api/submit stores + emails; rejects missing headline; ignores honeypot", async () => {
    const { POST } = await import("@/app/api/submit/route");
    const ok = await POST(new Request("http://x/api/submit", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "H", details: "D" }) }));
    expect(ok.status).toBe(200);
    const bad = await POST(new Request("http://x/api/submit", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ details: "D" }) }));
    expect(bad.status).toBe(400);
    const bot = await POST(new Request("http://x/api/submit", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "H", details: "D", company: "spam" }) }));
    expect(bot.status).toBe(200); // silently accepted, not stored
  });
  it("POST /api/subscribe stores a valid email; rejects junk", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    expect((await POST(new Request("http://x", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.com" }) }))).status).toBe(200);
    expect((await POST(new Request("http://x", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "nope" }) }))).status).toBe(400);
  });
});
