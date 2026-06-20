import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "@/components/Masthead";

describe("Masthead", () => {
  it("renders the full dateline + nav links to anchors", () => {
    render(
      <Masthead
        volLine="Vol. 1 — No. 1"
        dateline="Weekend Edition · Fri–Sun, Jun 19–21, 2026 · South Knoxville, TN"
        shortDate="Jun 19–21"
        sections={[{ id: "events", label: "Events" }]}
      />
    );
    expect(screen.getByText(/Weekend Edition/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Events" });
    expect(link.getAttribute("href")).toBe("#events");
  });
});
