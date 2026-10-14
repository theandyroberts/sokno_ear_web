import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZoomableImage } from "@/components/ZoomableImage";
import { Article } from "@/components/ds/Article.jsx";

// A map or diagram opens full screen on a click, with zoom and pan (Andy, 2026-10-14).
describe("ZoomableImage", () => {
  afterEach(() => { delete (window as any).umami; });

  it("shows the image with an expand hint and opens a dialog on click", () => {
    const trackFn = vi.fn(); (window as any).umami = { track: trackFn };
    render(<ZoomableImage src="/assets/diagrams/the-808-parking.svg" title="Where to park" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByRole("dialog", { name: "Where to park" })).toBeInTheDocument();
    expect(trackFn).toHaveBeenCalledWith("image-expand", { src: "/assets/diagrams/the-808-parking.svg" });
  });

  it("closes on Escape and on the close button", () => {
    render(<ZoomableImage src="/a.svg" />);
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("zooms with the buttons and the wheel, and Fit resets", () => {
    const { container } = render(<ZoomableImage src="/a.svg" />);
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));
    const img = () => container.querySelectorAll("img")[1] as HTMLImageElement;
    expect(img().style.transform).toContain("scale(1)");
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(img().style.transform).toContain("scale(1.25)");
    fireEvent.wheel(screen.getByRole("dialog").lastElementChild as Element, { deltaY: -100, clientX: 10, clientY: 10 });
    expect(parseFloat(img().style.transform.match(/scale\(([\d.]+)\)/)![1])).toBeGreaterThan(1.25);
    fireEvent.click(screen.getByRole("button", { name: /fit/i }));
    expect(img().style.transform).toContain("scale(1)");
  });

  it("Article renders a plain image unless imageZoom is set", () => {
    const { rerender } = render(<Article title="t" image="/a.svg"><p>b</p></Article>);
    expect(screen.queryByRole("button", { name: /expand/i })).toBeNull();
    rerender(<Article title="t" image="/a.svg" imageZoom><p>b</p></Article>);
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });
});
