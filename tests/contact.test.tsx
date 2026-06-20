import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import os from "node:os";
import path from "node:path";
import { ContactForm } from "@/components/ContactForm";

vi.mock("@/lib/mail", () => ({ sendContactEmail: vi.fn(async () => {}) }));

describe("ContactForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
  });
  it("posts email + message to /api/contact and shows a thank-you", async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByPlaceholderText(/your email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText(/your message/i), { target: { value: "Howdy" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/contact", expect.objectContaining({ method: "POST" }))
    );
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.email).toBe("a@b.com");
    expect(body.message).toBe("Howdy");
    await waitFor(() => expect(screen.getByText(/get back to you/i)).toBeInTheDocument());
  });
});

describe("POST /api/contact", () => {
  beforeEach(() => {
    process.env.SQLITE_PATH = path.join(os.tmpdir(), `contact-${Math.random()}.db`);
    vi.resetModules();
  });
  it("stores a valid message; rejects junk; honors honeypot", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const ok = await POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.com", message: "hi" }) }));
    expect(ok.status).toBe(200);
    const bad = await POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "nope", message: "hi" }) }));
    expect(bad.status).toBe(400);
    const bot = await POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.com", message: "hi", company: "x" }) }));
    expect(bot.status).toBe(200);
  });
});
