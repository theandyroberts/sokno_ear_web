import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DirtySouth } from "@/components/DirtySouth";
import { loadNightlife, pickDefaultDay, isSponsorDay } from "@/lib/nightlife";

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
  it("checking a box persists to localStorage scoped to this weekend; tapping a link marks it done", () => {
    render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    const first = nightlife.days.Thu[0];
    fireEvent.click(screen.getByRole("button", { name: `Check off ${first.headline}` }));
    const stored = JSON.parse(window.localStorage.getItem("dirtysouth-checked-v2")!);
    expect(stored.weekend).toBe(nightlife.weekend);
    expect(stored.ids).toContain(first.id);
    // and it renders checked
    expect(screen.getByRole("button", { name: `Uncheck ${first.headline}` })).toHaveAttribute("aria-pressed", "true");
  });
  it("checks from a previous weekend don't carry into a fresh week", async () => {
    const { waitFor } = await import("@testing-library/react");
    const first = nightlife.days.Thu[0];
    // same item id, but stored under LAST week's label — must render unchecked
    window.localStorage.setItem("dirtysouth-checked-v2", JSON.stringify({ weekend: "Aug 20–23", ids: [first.id] }));
    window.localStorage.setItem("dirtysouth-checked-v1", JSON.stringify([first.id])); // pre-scope leftovers too
    render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Check off ${first.headline}` })).toHaveAttribute("aria-pressed", "false"));
    expect(window.localStorage.getItem("dirtysouth-checked-v1")).toBeNull(); // old format cleaned up
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
  it("isSponsorDay: Mon-Wed true, Thu-Sun false (America/New_York)", () => {
    expect(isSponsorDay(new Date("2026-08-24T12:00:00Z"))).toBe(true);  // Monday
    expect(isSponsorDay(new Date("2026-08-25T12:00:00Z"))).toBe(true);  // Tuesday
    expect(isSponsorDay(new Date("2026-08-26T12:00:00Z"))).toBe(true);  // Wednesday
    expect(isSponsorDay(new Date("2026-08-27T12:00:00Z"))).toBe(false); // Thursday
    expect(isSponsorDay(new Date("2026-08-29T12:00:00Z"))).toBe(false); // Saturday
  });
  it("sponsor card renders name, address, phone, art when passed; absent otherwise", () => {
    const { rerender } = render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" sponsor={nightlife.sponsor!} />);
    expect(screen.getByText(/brought to you by/i)).toBeInTheDocument();
    // The name appears in the sponsor headline AND in the Thursday row's logo chip
    // (this render passes no resolved logos, so the chip falls back to the wordmark).
    expect(screen.getAllByText("Angry Dumplings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1119 Sevier Ave/).length).toBeGreaterThanOrEqual(2); // sponsor card + checklist entry
    expect(screen.getByRole("link", { name: /760\) 899-4121/ })).toHaveAttribute("href", "tel:7608994121");
    expect(screen.getByAltText(/from the Dirty South map/i)).toBeInTheDocument();
    rerender(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" sponsor={null} />);
    expect(screen.queryByText(/brought to you by/i)).not.toBeInTheDocument();
  });
  it("notify form posts to the dsparty list and confirms", async () => {
    const { waitFor } = await import("@testing-library/react");
    (global as any).fetch = (await import("vitest")).vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, welcomed: true }), { status: 200 })) as any;
    render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    fireEvent.change(screen.getByPlaceholderText(/your email/i), { target: { value: "doer@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /notify me/i }));
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/subscribe", expect.anything()));
    const body = JSON.parse(((global as any).fetch as any).mock.calls[0][1].body);
    expect(body.list).toBe("dsparty");
    await waitFor(() => expect(screen.getByText(/green hello headed to your inbox/i)).toBeInTheDocument());
  });
  it("escape hatches back to the Ear exist top and bottom", () => {
    render(<DirtySouth days={nightlife.days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />);
    const home = screen.getAllByRole("link", { name: /read this week's episode/i });
    expect(home.length).toBeGreaterThanOrEqual(2);
    home.forEach((a) => expect(a).toHaveAttribute("href", "/"));
  });
});
