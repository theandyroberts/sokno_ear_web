import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ShareStory } from "@/components/ShareStory";

// The link must end in something the reader can see on every kind of browser
// (Andy, 2026-11-09: in the desktop app's pane it "did nothing").
describe("ShareStory", () => {
  const nav = navigator as Navigator & { share?: unknown; canShare?: unknown; clipboard?: unknown };
  const pointer = (coarse: boolean) =>
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (q: string) => ({ matches: coarse && q.includes("coarse"), media: q, addEventListener() {}, removeEventListener() {} }),
    });
  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined });
    vi.restoreAllMocks();
    Reflect.deleteProperty(nav, "share");
    Reflect.deleteProperty(nav, "canShare");
    Object.defineProperty(nav, "clipboard", { value: undefined, configurable: true });
  });

  it("is a real permalink underneath", () => {
    render(<ShareStory slug="2026-11-11" id="aapi-night-market" title="Night market" />);
    expect(screen.getByRole("link", { name: "Share this story" })).toHaveAttribute("href", "/2026-11-11/aapi-night-market");
  });

  it("copies the absolute link on a desktop and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(nav, "clipboard", { value: { writeText }, configurable: true });
    render(<ShareStory slug="2026-11-11" id="aapi-night-market" />);
    fireEvent.click(screen.getByRole("link", { name: "Share this story" }));
    await waitFor(() => expect(screen.getByText("Link copied!")).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/2026-11-11/aapi-night-market`);
  });

  it("shows the link in a field when the clipboard refuses and nothing else works", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("Document is not focused.", "NotAllowedError"));
    Object.defineProperty(nav, "clipboard", { value: { writeText }, configurable: true });
    render(<ShareStory slug="2026-11-11" id="shogun-808" />);
    fireEvent.click(screen.getByRole("link", { name: "Share this story" }));
    const field = await screen.findByLabelText(/Select the link and copy it/);
    expect(field).toHaveValue(`${window.location.origin}/2026-11-11/shogun-808`);
    expect(screen.getByText("Copy this link")).toBeInTheDocument();
  });

  it("uses the share sheet on a touch screen, and copies instead when the sheet fails", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("nope", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    nav.share = share;
    Object.defineProperty(nav, "clipboard", { value: { writeText }, configurable: true });
    pointer(true);
    render(<ShareStory slug="2026-11-11" id="ahee-808" title="AHEE" />);
    fireEvent.click(screen.getByRole("link", { name: "Share this story" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "AHEE — The South Knoxville Ear", url: `${window.location.origin}/2026-11-11/ahee-808` }));
    await waitFor(() => expect(screen.getByText("Link copied!")).toBeInTheDocument());
  });

  it("stays quiet when the reader closes the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const writeText = vi.fn();
    nav.share = share;
    Object.defineProperty(nav, "clipboard", { value: { writeText }, configurable: true });
    pointer(true);
    render(<ShareStory slug="2026-11-11" id="ahee-808" />);
    fireEvent.click(screen.getByRole("link", { name: "Share this story" }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByText("Share this story")).toBeInTheDocument();
  });

  it("a desktop with a share sheet still copies: the sheet is a detour there", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    nav.share = share;
    Object.defineProperty(nav, "clipboard", { value: { writeText }, configurable: true });
    pointer(false);
    render(<ShareStory slug="2026-11-11" id="ahee-808" />);
    fireEvent.click(screen.getByRole("link", { name: "Share this story" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(share).not.toHaveBeenCalled();
  });
});
