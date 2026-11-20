import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DirtySouth } from "@/components/DirtySouth";
import { buildFeatured, type PlannerData } from "@/lib/planner";
import type { NightDay, NightItem } from "@/lib/nightlife";

// A fixed little weekend so these tests don't move when the weekly content does.
const row = (id: string, cat: string, venue: string, headline: string, time = "6:00 PM"): NightItem =>
  ({ id, cat, venue, headline, time, href: `/2026-11-18/${id}`, brand: venue.split(" · ")[0], logo: null });
const days: Record<NightDay, NightItem[]> = {
  Thu: [row("thu-eat", "food", "Redbud Kitchen · 906 Sevier Ave", "Thursday supper")],
  Fri: [
    row("fri-dumplings", "food", "Angry Dumplings · 1119 Sevier Ave", "Dumplings before the pitches"),
    row("fri-garage", "food", "SouthSide Garage · 1014 Sevier Ave", "Open for lunch, and the Friday torta", "11:00 AM"),
    row("fri-printshop", "drink", "Printshop Beer Co. · 1532 Island Home Ave", "Twelve-dollar flights", "12:00 PM"),
    row("fri-earls", "drink", "Earl's · 610 Waterfront Dr", "Nine-dollar spicy ritas", "4:00 PM"),
    row("fri-pitch", "star", "Hi-Wire Brewing · 2020 Barber St", "Pitch a Friend", "7:00 PM"),
  ],
  Sat: [],
  Sun: [],
};
const featured = buildFeatured(days);
const planner: PlannerData = {
  featured,
  directory: {
    eat: [
      { id: "v:angry-dumplings", cat: "eat", kind: "venue", title: "Angry Dumplings", brand: "Angry Dumplings", address: "1119 Sevier Ave", icon: "food" },
      { id: "v:kerns/ronis", cat: "eat", kind: "venue", title: "Roni's Mac Bar", brand: "Roni's Mac Bar", address: "at Kern's", icon: "food" },
    ],
    drink: [{ id: "v:trailhead", cat: "drink", kind: "venue", title: "Trailhead Beer Market", brand: "Trailhead Beer Market", address: "1317 Island Home Ave", icon: "drink" }],
  },
  merryAll: {
    Thu: [], Sat: [], Sun: [],
    Fri: [
      ...featured.Fri.merry,
      { id: "s:deadtronica", cat: "merry", kind: "story", time: "7:00 PM", title: "Deadtronica", brand: "The 808", venue: "The 808", href: "/2026-11-18/deadtronica", icon: "star" },
    ],
  },
  dates: { Thu: "Thu, Nov 19", Fri: "Fri, Nov 20", Sat: "Sat, Nov 21", Sun: "Sun, Nov 22" },
};
const page = (extra: Partial<React.ComponentProps<typeof DirtySouth>> = {}) =>
  render(<DirtySouth days={days} defaultDay="Fri" weekend="Nov 19–22" fontClass="" planner={planner} {...extra} />);

describe("Dirty South party planner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/dirtysouthparty");
  });

  it("headlines the planner and groups the night as Eat, Drink, Be merry", () => {
    page();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/dirty south\s*party planner/i);
    const heads = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.trim());
    expect(heads).toEqual(["Eat", "Drink", "Be merry"]);
    const eat = screen.getByRole("region", { name: "Eat" });
    expect(within(eat).getByText(/Dumplings before the pitches/)).toBeInTheDocument();
    expect(within(eat).getByText(/Friday torta/)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Drink" })).getByText(/Nine-dollar spicy ritas/)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Be merry" })).getByText(/Pitch a Friend/)).toBeInTheDocument();
  });

  it("a check makes that row the category's pick and shrinks the others to one word", () => {
    page();
    const eat = screen.getByRole("region", { name: "Eat" });
    fireEvent.click(within(eat).getByRole("button", { name: "Pick Dumplings before the pitches for eat" }));
    // the other featured eat row is now a one-word chip, not a full row
    expect(within(eat).queryByText(/Friday torta/)).not.toBeInTheDocument();
    const chip = within(eat).getByRole("button", { name: /Pick Open for lunch.* for eat instead/ });
    expect(chip).toHaveTextContent("SouthSide Garage");
    // the game plan has it
    const plan = screen.getByRole("region", { name: "Your Friday game plan" });
    expect(within(plan).getByText(/Dumplings before the pitches/)).toBeInTheDocument();
    // a chip swaps the pick
    fireEvent.click(chip);
    expect(within(plan).getByText(/Friday torta/)).toBeInTheDocument();
    expect(within(plan).queryByText(/Dumplings before the pitches/)).not.toBeInTheDocument();
    // unchecking the pick brings every row back
    fireEvent.click(within(eat).getByRole("button", { name: /Unpick Open for lunch/ }));
    expect(within(eat).getByText(/Dumplings before the pitches/)).toBeInTheDocument();
    expect(within(plan).queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("show all opens one-line entries for every spot, and one can be the pick", () => {
    page();
    const eat = screen.getByRole("region", { name: "Eat" });
    fireEvent.click(within(eat).getByRole("button", { name: "(show all)" }));
    const list = within(eat).getByRole("list", { name: "Every eat option" });
    expect(within(list).getByText("Roni's Mac Bar")).toBeInTheDocument();
    expect(within(list).getByText(/at Kern's/)).toBeInTheDocument();
    fireEvent.click(within(list).getByRole("button", { name: "Pick Roni's Mac Bar for eat" }));
    const plan = screen.getByRole("region", { name: "Your Friday game plan" });
    expect(within(plan).getByText("Roni's Mac Bar")).toBeInTheDocument();
    // be merry's show all brings the episode's stories for the night
    const merry = screen.getByRole("region", { name: "Be merry" });
    fireEvent.click(within(merry).getByRole("button", { name: "(show all)" }));
    expect(within(merry).getByText("Deadtronica")).toBeInTheDocument();
  });

  it("unticking a type hides its section and keeps it out of the game plan", () => {
    page();
    fireEvent.click(screen.getByRole("button", { name: "Pick Nine-dollar spicy ritas for drink" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick Pitch a Friend for be merry" }));
    fireEvent.click(screen.getByRole("button", { name: /Drink/, pressed: true }));
    expect(screen.queryByRole("region", { name: "Drink" })).not.toBeInTheDocument();
    const plan = screen.getByRole("region", { name: "Your Friday game plan" });
    expect(within(plan).queryByText(/spicy ritas/)).not.toBeInTheDocument();
    expect(within(plan).getByText(/Pitch a Friend/)).toBeInTheDocument();
    expect(window.location.search).toContain("t=eat%2Cmerry");
  });

  it("with no share sheet, Share copies a link that reopens this exact plan", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    page();
    fireEvent.click(screen.getByRole("button", { name: "Pick Dumplings before the pitches for eat" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick Pitch a Friend for be merry" }));
    fireEvent.click(screen.getByRole("button", { name: "★ Share my game plan" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = new URL((writeText.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toBe("/dirtysouthparty");
    expect(url.searchParams.get("day")).toBe("Fri");
    expect(url.searchParams.get("eat")).toBe("fri-dumplings");
    expect(url.searchParams.get("merry")).toBe("fri-pitch");
    expect(await screen.findByText(/Link copied/)).toBeInTheDocument();
  });

  it("when the share sheet errors, the link goes to the clipboard; closing the sheet does nothing", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const share = vi.fn(async () => { throw new DOMException("not allowed", "NotAllowedError"); });
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    page();
    fireEvent.click(screen.getByRole("button", { name: "Pick Nine-dollar spicy ritas for drink" }));
    fireEvent.click(screen.getByRole("button", { name: "★ Share my game plan" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("DRINK — 4:00 PM · Earl's: Nine-dollar spicy ritas") }));
    share.mockImplementationOnce(async () => { throw new DOMException("closed", "AbortError"); });
    fireEvent.click(screen.getByRole("button", { name: "★ Share my game plan" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("a shared link opens on its day with its picks", () => {
    page({ initial: { day: "Fri", picks: { drink: "fri-printshop", merry: "s:deadtronica" } } });
    const plan = screen.getByRole("region", { name: "Your Friday game plan" });
    expect(within(plan).getByText(/Twelve-dollar flights/)).toBeInTheDocument();
    expect(within(plan).getByText(/Deadtronica/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fri" })).toHaveAttribute("aria-selected", "true");
  });

  it("picks persist per weekend; last weekend's picks and the old checklist are cleared", async () => {
    page();
    fireEvent.click(screen.getByRole("button", { name: "Pick Dumplings before the pitches for eat" }));
    const stored = JSON.parse(window.localStorage.getItem("dirtysouth-plan-v1")!);
    expect(stored.weekend).toBe("Nov 19–22");
    expect(stored.picks.Fri.eat).toBe("fri-dumplings");
  });

  it("a stored plan from a different weekend is ignored", async () => {
    window.localStorage.setItem("dirtysouth-plan-v1", JSON.stringify({ weekend: "Nov 12–15", picks: { Fri: { eat: "fri-dumplings" } }, types: ["eat"] }));
    window.localStorage.setItem("dirtysouth-checked-v2", JSON.stringify({ weekend: "Nov 19–22", ids: ["fri-dumplings"] }));
    page();
    await waitFor(() => expect(window.localStorage.getItem("dirtysouth-checked-v2")).toBeNull());
    expect(screen.getByRole("region", { name: "Drink" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Your Friday game plan" })).queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("the game plan runs in time order: four o'clock drinks before six o'clock dumplings", () => {
    page();
    fireEvent.click(screen.getByRole("button", { name: "Pick Dumplings before the pitches for eat" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick Nine-dollar spicy ritas for drink" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick Pitch a Friend for be merry" }));
    const plan = screen.getByRole("region", { name: "Your Friday game plan" });
    const cats = within(plan).getAllByRole("listitem").map((li) => li.querySelector(".ds-plan-cat")?.textContent);
    expect(cats).toEqual(["Drink", "Eat", "Be merry"]);
  });

  it("an explainer spells out three steps, and each links to its numbered step on the page", () => {
    const { container } = page();
    const explainer = screen.getByRole("region", { name: "Easy as 1, 2, 3" });
    const links = within(explainer).getAllByRole("link");
    // the demos are decoration (aria-hidden); the link reads as the step, spelled out
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAccessibleName("Step 1: Pick your mix Tick what kind of party: eat, drink, be merry.");
    expect(links[1]).toHaveAccessibleName("Step 2: Pick the night Thursday, Friday, Saturday or Sunday.");
    expect(links[2]).toHaveAccessibleName("Step 3: Check & share Check one spot in each, then send the game plan to your crew.");
    links.forEach((a, i) => {
      const target = container.querySelector(a.getAttribute("href")!);
      expect(target).not.toBeNull();
      expect(target?.querySelector(".ds-stepbadge")?.textContent).toBe(String(i + 1));
    });
    // the steps sit in order: types (1), then days (2), then the game plan (3)
    const order = ["#ds-step-1", "[role=tablist]", "#ds-step-3", "#game-plan"].map((sel) => container.querySelector(sel)!);
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // the badge digit stays out of the type chooser's accessible name
    expect(screen.getByRole("group", { name: "What kind of party?" })).toBeInTheDocument();
  });

  it("the sticky share bar appears once there is something to share", () => {
    page();
    expect(screen.queryByRole("button", { name: /Share my Friday game plan/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pick Pitch a Friend for be merry" }));
    expect(screen.getByRole("button", { name: "★ Share my Friday game plan · 1" })).toBeInTheDocument();
  });
});
