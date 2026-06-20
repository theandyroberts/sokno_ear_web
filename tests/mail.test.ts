import { describe, it, expect, vi } from "vitest";

const send = vi.fn(async () => ({ data: { id: "x" }, error: null }));
vi.mock("resend", () => ({ Resend: vi.fn(function () { return { emails: { send } }; }) }));

import { sendSubmissionEmail } from "@/lib/mail";

describe("mail", () => {
  it("sends from send.note15.com to andy@note15.com with the headline in the subject", async () => {
    process.env.RESEND_API_KEY = "test";
    await sendSubmissionEmail({ headline: "Block party", details: "Sat noon", url: "", dates: "", contact: "" });
    expect(send).toHaveBeenCalledTimes(1);
    const arg = (send.mock.calls as any[][])[0][0];
    expect(arg.from).toContain("send.note15.com");
    expect(arg.to).toContain("andy@note15.com");
    expect(arg.subject).toContain("Block party");
  });
  it("no-ops without an API key (does not throw)", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendSubmissionEmail({ headline: "H", details: "D" })).resolves.toBeUndefined();
  });
});
