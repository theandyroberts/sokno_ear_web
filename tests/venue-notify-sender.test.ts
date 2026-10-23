// Exercise the CLI wiring with ALL filesystem, mail and desk-sync I/O mocked.
// Never execute this sender against a real episode or real Resend credentials.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(), readFileSync: vi.fn(), existsSync: vi.fn(), writeFileSync: vi.fn(),
}));
vi.mock("node:fs", () => ({ default: {
  ...mocks, mkdirSync: vi.fn(), readdirSync: vi.fn(() => ["2099-01-07.json"]),
} }));
vi.mock("resend", () => ({
  Resend: vi.fn(function () { return { emails: { send: mocks.send } }; }),
}));
vi.mock("../scripts/pub-status-store.mjs", () => ({ syncQuietly: vi.fn() }));
vi.mock("../scripts/pub-status-lib.mjs", () => ({ weekOf: vi.fn(() => "2099-01-07") }));

const originalArgv = process.argv;
let recipient: string | string[];
let introduced: string | null;
let alreadySent: boolean;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  recipient = "venue@example.com";
  introduced = "2099-01-01";
  alreadySent = false;
  for (const key of ["VENUE_FROM", "VENUE_REPLY_TO", "SUBMIT_TO", "PREVIEW_TO"]) vi.stubEnv(key, "");
  vi.stubEnv("RESEND_API_KEY", "test-not-a-real-key");
  // Defense in depth: an unexpected network request must fail, never deliver.
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in sender tests"); }));
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.send.mockResolvedValue({ data: { id: "mock-delivery" }, error: null });
  mocks.existsSync.mockImplementation((file: string) => alreadySent && file.endsWith("/2099-01-07.json"));
  mocks.readFileSync.mockImplementation((file: string) => {
    if (file.endsWith("/episodes/2099-01-07.json")) return JSON.stringify({
      slug: "2099-01-07", date: "2099-01-07", number: 1,
      stories: [{ id: "test-event", title: "Test event", social: { igTags: ["venue"] } }],
    });
    if (file.endsWith("/contacts.json")) return JSON.stringify({ contacts: {
      venue: { name: "Test venue", to: recipient, introduced },
    } });
    if (file.endsWith("/venue-notify/2099-01-07.json")) return JSON.stringify({ venue: { id: "prior-send" } });
    throw new Error(`Unexpected file read: ${file}`);
  });
});
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function run(mode: string) {
  process.argv = ["node", "scripts/venue-notify.mjs", mode];
  await import("../scripts/venue-notify.mjs");
}

describe("venue outreach sender", () => {
  it("BCCs Andy on the actual Resend payload and preserves sender/reply identities", async () => {
    await run("send");
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      from: "Andy Roberts <andy@updates.note15.com>", to: recipient,
      bcc: ["andy@note15.com"], replyTo: "andy@note15.com",
    }));
    expect(mocks.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("/venue-notify/2099-01-07.json"), expect.stringContaining("mock-delivery"),
    );
  });
  it("does not duplicate the default preview recipient or record a real send", async () => {
    await run("preview");
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: "andy@note15.com", bcc: undefined }));
    expect(mocks.writeFileSync.mock.calls.some(([file]) => file.endsWith("/venue-notify/2099-01-07.json"))).toBe(false);
  });
  it("still BCCs Andy when preview and reply-to point elsewhere", async () => {
    vi.stubEnv("PREVIEW_TO", "reviewer@example.com");
    vi.stubEnv("VENUE_REPLY_TO", "reply@example.com");
    await run("preview");
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      to: "reviewer@example.com", bcc: ["andy@note15.com"], replyTo: "reply@example.com",
    }));
  });
  it("does not add BCC when the venue recipients already include Andy", async () => {
    recipient = ["venue@example.com", "Andy Roberts <ANDY@NOTE15.COM>"];
    await run("send");
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: recipient, bcc: undefined }));
  });
  it("does not send or BCC first-contact drafts", async () => {
    introduced = null;
    await run("send");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("preserves the already-sent guard", async () => {
    alreadySent = true;
    await run("send");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not send in plan mode", async () => {
    await run("plan");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
