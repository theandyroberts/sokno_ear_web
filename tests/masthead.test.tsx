import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "@/components/Masthead";

describe("Masthead", () => {
  it("renders dateline + nav links to anchors", () => {
    render(<Masthead dateline="Weekend Edition · Jun 20, 2026 · South Knoxville, TN"
      volLine="Vol. 1 — No. 1" sections={[{ id: "events", label: "Events" }]} />);
    expect(screen.getByText(/Weekend Edition/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Events" });
    expect(link.getAttribute("href")).toBe("#events");
  });
});
