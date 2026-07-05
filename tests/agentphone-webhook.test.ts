import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";

vi.mock("@/lib/mail", () => ({ sendSubmissionEmail: vi.fn(async () => {}) }));

const SECRET = "whsec_test_secret";

beforeEach(() => {
  process.env.SQLITE_PATH = path.join(os.tmpdir(), `agentphone-${Math.random()}.db`);
  process.env.AGENTPHONE_WEBHOOK_SECRET = SECRET;
  delete process.env.AGENTPHONE_WEBHOOK_REQUIRE_SIGNATURE;
  vi.resetModules();
  vi.clearAllMocks();
});

describe("POST /webhooks/general-intake", () => {
  it("stores a signed completed call and creates a submission when listing facts are present", async () => {
    const { POST } = await import("@/app/webhooks/general-intake/route");
    const { db } = await import("@/lib/db");
    const { sendSubmissionEmail } = await import("@/lib/mail");

    const res = await POST(signedRequest(exampleDrinkSpecialPayload(), "del_ready_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.missingFields).toEqual([]);
    expect(body.submissionId).toEqual(expect.any(Number));
    expect(sendSubmissionEmail).toHaveBeenCalledTimes(1);

    const submission = db().prepare("SELECT headline, details, dates, contact FROM submissions").get() as {
      headline: string;
      details: string;
      dates: string;
      contact: string;
    };
    expect(submission.headline).toMatch(/World Cup pints/i);
    expect(submission.details).toMatch(/The High Wire/i);
    expect(submission.details).toMatch(/two dollar and fifty cent pints/i);
    expect(submission.dates).toMatch(/Friday night all night|Friday Night all night/i);
    expect(submission.contact).toContain("+13102924925");
  });

  it("dedupes repeated webhook delivery IDs", async () => {
    const { POST } = await import("@/app/webhooks/general-intake/route");
    const { db } = await import("@/lib/db");
    const { sendSubmissionEmail } = await import("@/lib/mail");

    const payload = exampleDrinkSpecialPayload();
    const first = await POST(signedRequest(payload, "del_dupe_1"));
    const second = await POST(signedRequest(payload, "del_dupe_1"));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.duplicate).toBe(true);
    expect(sendSubmissionEmail).toHaveBeenCalledTimes(1);
    expect((db().prepare("SELECT COUNT(*) AS count FROM submissions").get() as { count: number }).count).toBe(1);
    expect((db().prepare("SELECT COUNT(*) AS count FROM agentphone_intakes").get() as { count: number }).count).toBe(1);
  });

  it("rejects invalid signatures", async () => {
    const { POST } = await import("@/app/webhooks/general-intake/route");
    const body = JSON.stringify(exampleDrinkSpecialPayload());
    const res = await POST(new Request("http://x/webhooks/general-intake", {
      method: "POST",
      headers: {
        "x-webhook-id": "del_bad_sig",
        "x-webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-webhook-signature": "sha256=bad",
      },
      body,
    }));

    expect(res.status).toBe(401);
  });

  it("keeps incomplete calls for review without creating a submission", async () => {
    const { POST } = await import("@/app/webhooks/general-intake/route");
    const { db } = await import("@/lib/db");

    const res = await POST(signedRequest({
      event: "agent.call_ended",
      channel: "voice",
      timestamp: "2026-06-27T11:03:16Z",
      agentId: "cmqv25qba0brh13w0h5hjfx3g",
      data: {
        callId: "call_incomplete",
        from: "+13102924925",
        to: "+18652526500",
        status: "completed",
        transcript: [{ role: "user", content: "I have something going on soon." }],
      },
    }, "del_incomplete_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ready).toBe(false);
    expect(body.missingFields).toContain("listing type");
    expect((db().prepare("SELECT COUNT(*) AS count FROM submissions").get() as { count: number }).count).toBe(0);
    expect((db().prepare("SELECT listing_status FROM agentphone_intakes").get() as { listing_status: string }).listing_status).toBe("needs_review");
  });
});

function signedRequest(payload: unknown, webhookId: string): Request {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex");
  return new Request("http://x/webhooks/general-intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-id": webhookId,
      "x-webhook-timestamp": timestamp,
      "x-webhook-signature": `sha256=${signature}`,
    },
    body,
  });
}

function exampleDrinkSpecialPayload() {
  return {
    event: "agent.call_ended",
    channel: "voice",
    timestamp: "2026-06-27T11:03:16Z",
    agentId: "cmqv25qba0brh13w0h5hjfx3g",
    data: {
      callId: "call_high_wire",
      numberId: "num_soknoear",
      from: "+13102924925",
      to: "+18652526500",
      direction: "inbound",
      status: "completed",
      startedAt: "2026-06-27T11:01:47Z",
      endedAt: "2026-06-27T11:03:16Z",
      durationSeconds: 88,
      summary: "Caller submitted a Friday night drink special for The High Wire: $2.50 pints all night for college students.",
      transcript: [
        { role: "agent", content: "Hey, South Knoxville Ear demo here. What're you planning?" },
        { role: "user", content: "I am planning a drink special." },
        { role: "agent", content: "Nice, what kind of bar or crowd is it for?" },
        { role: "user", content: "It is for college students. And it's two dollar and fifty cent pints." },
        { role: "agent", content: "Nice, what night of the week are you running it? Two dollars fifty cents per pint, got it." },
        { role: "user", content: "Friday night." },
        { role: "agent", content: "Got it. What time window are you running it?" },
        { role: "user", content: "All night." },
        { role: "agent", content: "Perfect." },
        { role: "user", content: "Set the high wire" },
        { role: "user", content: "That's the bar called the high wire. Yes." },
        { role: "agent", content: "Want a short promo line for a flyer or the SMS blast?" },
        { role: "user", content: "World Cup pints two fifty at the high wire." },
        { role: "agent", content: "\"World Cup pints - two dollars fifty all night at the High Wire.\"" },
        { role: "user", content: "That's perfect." },
      ],
    },
  };
}
