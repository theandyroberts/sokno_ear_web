import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";

vi.mock("@/lib/mail", () => ({
  sendSubmissionEmail: vi.fn(async () => {}),
  sendStoryDraftEmail: vi.fn(async () => {}),
  sendDraftLinkEmail: vi.fn(async () => {}),
  sendDraftCommentEmail: vi.fn(async () => {}),
  sendSubmitterRegistrationEmail: vi.fn(async () => {}),
}));

const SECRET = "whsec_test_secret";

beforeEach(() => {
  process.env.SQLITE_PATH = path.join(os.tmpdir(), `agentphone-${Math.random()}.db`);
  process.env.AGENTPHONE_WEBHOOK_SECRET = SECRET;
  delete process.env.AGENTPHONE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_EXTRACTION_MODEL;
  delete process.env.AGENTPHONE_WEBHOOK_REQUIRE_SIGNATURE;
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
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

  it("sends an acknowledgement text for inbound SMS", async () => {
    process.env.AGENTPHONE_API_KEY = "ap_test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "msg_ack", status: "sent" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/webhooks/general-intake/route");
    const { db } = await import("@/lib/db");

    const res = await POST(signedRequest(exampleSmsPayload("Here is the link https://example.com/event"), "del_sms_ack_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.textAckSent).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://api.agentphone.ai/v1/messages", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer ap_test" }),
    }));
    const requestBody = JSON.parse(String((fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0][1].body));
    expect(requestBody).toEqual(expect.objectContaining({
      agent_id: "cmqv25qba0brh13w0h5hjfx3g",
      to_number: "+13102924925",
      body: "Got it - the SoKno Ear received your link and will include it with the review.",
    }));
    expect((db().prepare("SELECT channel, listing_status FROM agentphone_intakes").get() as { channel: string; listing_status: string })).toEqual({
      channel: "sms",
      listing_status: "needs_review",
    });
  });

  it("does not send duplicate acknowledgement texts for webhook retries", async () => {
    process.env.AGENTPHONE_API_KEY = "ap_test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "msg_ack", status: "sent" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/webhooks/general-intake/route");
    const payload = exampleSmsPayload("Actually, ticket prices need checking.");

    const first = await POST(signedRequest(payload, "del_sms_dupe_1"));
    const second = await POST(signedRequest(payload, "del_sms_dupe_1"));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.duplicate).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(String((fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0][1].body));
    expect(requestBody.body).toBe("Got it - the SoKno Ear received that correction.");
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

    // Incomplete calls still get a story draft (with follow-up questions) at intake time.
    const { sendStoryDraftEmail } = await import("@/lib/mail");
    expect(body.storyDraftId).toEqual(expect.any(Number));
    expect(sendStoryDraftEmail).toHaveBeenCalledTimes(1);
    const draftRow = db().prepare("SELECT source, status, intake_id, submission_id FROM story_drafts").get() as {
      source: string; status: string; intake_id: number; submission_id: number | null;
    };
    expect(draftRow.source).toBe("phone");
    expect(draftRow.status).toBe("new");
    expect(draftRow.submission_id).toBeNull();
  });

  it("uses OpenAI structured extraction for completed calls when configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_EXTRACTION_MODEL = "gpt-5.4-nano";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            listingType: "drink_special",
            title: "Hi-Wire Sunday margaritas and Bloody Marys",
            venueName: "Hi-Wire",
            venueLocation: "Sevier Avenue",
            offer: "$5 margaritas and $6 Bloody Marys",
            scheduleText: "Sunday, 2026-07-05, noon to 9 PM",
            dayOfWeek: "Sunday",
            date: "2026-07-05",
            startTime: "noon",
            endTime: "9 PM",
            audience: "",
            promoLine: "",
            summary: "Drink special at Hi-Wire on Sevier Avenue on Sunday from noon to 9 PM.",
            sourceContact: "+13102924925",
            missingFields: [],
            confidence: 0.94,
          }),
        }],
      }],
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const { POST } = await import("@/app/webhooks/general-intake/route");
    const { db } = await import("@/lib/db");

    const res = await POST(signedRequest(exampleHiWireSundayPayload(), "del_openai_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({ method: "POST" })
    );

    const submission = db().prepare("SELECT headline, details, dates FROM submissions").get() as {
      headline: string;
      details: string;
      dates: string;
    };
    expect(submission.headline).toMatch(/Hi-Wire Sunday/i);
    expect(submission.details).toContain("Extraction: OpenAI structured output");
    expect(submission.details).toContain("Venue: Hi-Wire on Sevier Avenue");
    expect(submission.details).toContain("Offer: $5 margaritas and $6 Bloody Marys");
    expect(submission.details).toContain("Schedule: Sunday, 2026-07-05, noon to 9 PM");
    expect(submission.details).not.toContain("Venue: Noon");
    expect(submission.dates).toBe("Sunday, 2026-07-05, noon to 9 PM");
  });

  it("does not let optional OpenAI missingFields block an otherwise complete special", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            listingType: "drink_special",
            title: "Hi-Wire margaritas",
            venueName: "Hi-Wire",
            venueLocation: "",
            offer: "$5 margaritas",
            scheduleText: "Sunday, noon to 9 PM",
            dayOfWeek: "Sunday",
            date: "",
            startTime: "noon",
            endTime: "9 PM",
            audience: "",
            promoLine: "",
            summary: "Drink special at Hi-Wire on Sunday.",
            sourceContact: "+18652526500",
            missingFields: ["venueLocation", "audience", "sourceContact"],
            confidence: 0.83,
          }),
        }],
      }],
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const { POST } = await import("@/app/webhooks/general-intake/route");
    const { db } = await import("@/lib/db");

    const res = await POST(signedRequest(exampleHiWireSundayPayload(), "del_optional_missing_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.missingFields).toEqual([]);
    expect((db().prepare("SELECT COUNT(*) AS count FROM submissions").get() as { count: number }).count).toBe(1);
    expect((db().prepare("SELECT listing_status FROM agentphone_intakes").get() as { listing_status: string }).listing_status).toBe("ready");
    expect((db().prepare("SELECT contact FROM submissions").get() as { contact: string }).contact).toContain("+13102924925");
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

function exampleSmsPayload(message: string) {
  return {
    event: "agent.message",
    channel: "sms",
    timestamp: "2026-07-08T13:15:00Z",
    agentId: "cmqv25qba0brh13w0h5hjfx3g",
    data: {
      conversationId: "conv_sms_test",
      messageId: "msg_inbound_test",
      numberId: "num_soknoear",
      from: "+13102924925",
      to: "+18652526500",
      message,
      direction: "inbound",
      receivedAt: "2026-07-08T13:15:00Z",
    },
    recentHistory: [],
  };
}

function exampleHiWireSundayPayload() {
  return {
    event: "agent.call_ended",
    channel: "voice",
    timestamp: "2026-07-05T00:31:29Z",
    agentId: "cmqv25qba0brh13w0h5hjfx3g",
    data: {
      callId: "cmr721nux00vu8iruvhkwvtyh",
      from: "+13102924925",
      to: "+18652526500",
      direction: "inbound",
      status: "completed",
      transcript: [
        { role: "agent", content: "Hey — I’m Amber, the South Knoxville Events and Rumors specials intake agent. What're you planning? Tell me about your event and we’ll get it into The Ear!" },
        { role: "user", content: "Okay. I've got a drink special for the High Wire. On Sunday." },
        { role: "agent", content: "Ooh — what’s the drink special?" },
        { role: "user", content: "It is five dollar margaritas and six dollar Bloody Mary starting at noon." },
        { role: "agent", content: "Love that — which High Wire is this: the High Wire on Sevier Avenue or another spot?" },
        { role: "user", content: "On Sevier Avenue." },
        { role: "agent", content: "Got it — five dollar margaritas and six dollar Bloody Marys starting at noon on Sunday at the High Wire on Sevier Avenue. What's the end time or how long does the special run?" },
        { role: "user", content: "Rinse till nine PM." },
        { role: "agent", content: "Got it — we'll give it a listen and get it on the board. Keep your ears open!" },
      ],
    },
  };
}
