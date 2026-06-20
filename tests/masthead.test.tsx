import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "@/components/Masthead";

describe("Masthead", () => {
  it("renders the compact topline + nav links to anchors", () => {
    render(<Masthead topline="Vol. 1 — No. 1 · Jun 19–21" sections={[{ id: "events", label: "Events" }]} />);
    expect(screen.getByText(/Vol\. 1 — No\. 1/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Events" });
    expect(link.getAttribute("href")).toBe("#events");
  });
});
