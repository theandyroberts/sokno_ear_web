import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DirtySouth } from "@/components/DirtySouth";
import { loadNightlife, pickDefaultDay } from "@/lib/nightlife";

const nightlife = loadNightlife();

describe("nightlife", () => {
  it("pickDefaultDay: weekend nights show themselves, weekdays show Thursday", () => {
    // Dates pinned to noon UTC = morning America/New_York, no midnight edge.
    expect(pickDefaultDay(new Date("2026-08-20T12:00:00Z"))).toBe("Thu");
    expect(pickDefaultDay(new Date("2026-08-22T12:00:00Z"))).toBe("Sat");
    expect(pickDefaultDay(new Date("2026-08-23T12:00:00Z"))).toBe("Sun");
    expect(pickDefaultDay(new Date("2026-08-17T12:00:00Z"))).toBe("Thu"); // Monday
    expect(pickDefaultDay(new Date("2026-08-18T12:00:00Z"))).toBe("Thu"); // Tuesday
  });
  it("every day has items and every item has the fields the checklist renders", () => {
    for (const day of ["Thu", "Fri", "Sat", "Sun"] as const) {
      expect(nightlife.days[day].length).toBeGreaterThan(3);
      for (const item of nightlife.days[day]) {
        expect(item.id).toBeTruthy();
        expect(item.headline).toBeTruthy();
        expect(item.href).toBeTruthy();
        expect(item.cat).toMatch(/^(food|drink|music|dance|mic|star)$/);
      }
    }
  });
});

describe("DirtySouth checklist", () => {
  beforeEach(() => window.localStorage.clear());
  it("defaults to the given day, switches on tab click", () => {
    render(<DirtySouth days={nightlife.days} defaultDay="Fri" weekend={nightlife.weekend} fontClass="" />);
    expect(screen.getByText("Friday night")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Sun" }));
    expect(screen.getByText("Sunday night")).toBeInTheDocument();
  });
  it("checking a box persists to localStorage; tapping a link marks it done", () => {
    render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    const first = nightlife.days.Thu[0];
    fireEvent.click(screen.getByRole("button", { name: `Check off ${first.headline}` }));
    expect(JSON.parse(window.localStorage.getItem("dirtysouth-checked-v1")!)).toContain(first.id);
    // and it renders checked
    expect(screen.getByRole("button", { name: `Uncheck ${first.headline}` })).toHaveAttribute("aria-pressed", "true");
  });
  it("intro explains the page; map button only renders when a map image exists", () => {
    const { rerender } = render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    expect(screen.getByText(/everything you reach by crossing the bridge/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /map of the territory/i })).not.toBeInTheDocument();
    rerender(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" mapSrc="/assets/dirtysouth_map.jpg" />);
    fireEvent.click(screen.getByRole("button", { name: /map of the territory/i }));
    expect(screen.getByRole("dialog", { name: /map of the dirty south/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close map/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("escape hatches back to the Ear exist top and bottom", () => {
    render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    const home = screen.getAllByRole("link", { name: /read this week's episode/i });
    expect(home.length).toBeGreaterThanOrEqual(2);
    home.forEach((a) => expect(a).toHaveAttribute("href", "/"));
  });
});
