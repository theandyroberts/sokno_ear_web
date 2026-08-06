import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventSubmitForm } from "@/components/EventSubmitForm";
import { SubscribeForm } from "@/components/SubscribeForm";

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
});

describe("forms", () => {
  it("EventSubmitForm posts headline+details to /api/submit", async () => {
    render(<EventSubmitForm />);
    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: "Block party" } });
    fireEvent.change(screen.getByPlaceholderText(/what.*happening|details/i), { target: { value: "Sat noon" } });
    fireEvent.click(screen.getByRole("button", { name: /tell the ear|submit/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/submit", expect.objectContaining({ method: "POST" })));
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.headline).toBe("Block party");
    expect(body.details).toBe("Sat noon");
  });
  it("EventSubmitForm shows a thank-you after success", async () => {
    render(<EventSubmitForm />);
    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: "X" } });
    fireEvent.change(screen.getByPlaceholderText(/what.*happening|details/i), { target: { value: "Y" } });
    fireEvent.click(screen.getByRole("button", { name: /tell the ear|submit/i }));
    await waitFor(() => expect(screen.getByText(/thank|got it|we'?re all ears/i)).toBeInTheDocument());
  });
  it("SubscribeForm posts email to /api/subscribe and shows the welcome state", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, welcomed: true }), { status: 200 })) as any;
    render(<SubscribeForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/subscribe", expect.anything()));
    await waitFor(() => expect(screen.getByText(/welcome to the ear, neighbor/i)).toBeInTheDocument());
    expect(screen.getByText(/hello note just left for your inbox/i)).toBeInTheDocument();
  });
  it("SubscribeForm tells a repeat subscriber they're already on the list", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, welcomed: false }), { status: 200 })) as any;
    render(<SubscribeForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    await waitFor(() => expect(screen.getByText(/already on the list/i)).toBeInTheDocument());
    expect(screen.getByText(/you'?re all set/i)).toBeInTheDocument();
  });
  it("SubscribeForm shows an error and keeps the form when the request fails", async () => {
    global.fetch = vi.fn(async () => new Response("nope", { status: 500 })) as any;
    render(<SubscribeForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/didn'?t go through/i));
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeInTheDocument(); // can retry
  });
});
