import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { EventRow } from "@/components/EventRow";
import { Masthead } from "@/components/Masthead";
import VenuePage from "@/app/venue/[key]/page";
import PlacePage from "@/app/place/[key]/page";
import DayPage from "@/app/day/[weekday]/page";
import SearchPage from "@/app/search/page";
import type { ArticleEntry } from "@/lib/search";

const article: ArticleEntry = {
  slug: "2026-10-28", storyId: "halloween-808", href: "/2026-10-28/halloween-808",
  title: "A very long headline that would certainly need more than two lines on a phone and so gets an ellipsis at the end of line two",
  label: "Old Sevier", labelColor: "rust", categoryKey: "old-sevier", venueKey: "the-808", venueName: "The 808",
  image: "/assets/spots/x.jpg", ticket: { href: "https://tickets.example.com/808", image: "/assets/tickets/808.svg", alt: "Tickets for the 808 show" },
  startDate: "2026-10-31T19:00:00-04:00", eventStart: "2026-10-31T19:00:00-04:00", episodeNumber: 20, episodeDate: "2026-10-28",
  episodeShortDate: "Oct 29–Nov 1", allDay: false, text: "",
};

describe("EventRow", () => {
  it("time, thumbnail and headline to the article; the ticket to a new tab", () => {
    const { container } = render(<ul><EventRow article={article} sub="Sat Oct 31 · 7 PM" /></ul>);
    const row = container.querySelector(".ear-event-row")!;
    expect(row.querySelector(".ear-event-time")!.textContent).toBe("7 PM");
    const thumb = row.querySelector("a.ear-event-thumb")!;
    expect(thumb.getAttribute("href")).toBe(article.href);
    expect(thumb.querySelector("img")!.getAttribute("src")).toBe(article.image);
    const title = within(row as HTMLElement).getByRole("link", { name: /A very long headline/ });
    expect(title.getAttribute("href")).toBe(article.href);
    expect(title.className).toContain("ear-clamp-2");
    const ticket = within(row as HTMLElement).getByRole("link", { name: /Tickets for the 808 show/ });
    expect(ticket).toHaveAttribute("href", article.ticket!.href);
    expect(ticket).toHaveAttribute("target", "_blank");
    expect(ticket).toHaveAttribute("rel", "noopener noreferrer");
    expect(row.querySelector(".ear-event-sub")!.textContent).toBe("Sat Oct 31 · 7 PM");
  });
  it("no image → a cream placeholder; no ticket → no ticket link; no time → a dash", () => {
    const { container } = render(<ul><EventRow article={{ ...article, image: undefined, ticket: undefined, eventStart: undefined }} sub="Oct 29–Nov 1" /></ul>);
    expect(container.querySelector(".ear-event-thumb-blank")).toBeTruthy();
    expect(container.querySelector(".ear-event-ticket")).toBeNull();
    expect(container.querySelector(".ear-event-time")!.textContent).toBe("—");
  });
});

describe("the two-line clamp", () => {
  it("is defined in globals.css the -webkit-box way", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("app/globals.css", "utf8");
    const rule = css.match(/\.ear-clamp-2\s*\{[^}]*\}/)![0];
    expect(rule).toContain("display: -webkit-box");
    expect(rule).toContain("-webkit-line-clamp: 2");
    expect(rule).toContain("-webkit-box-orient: vertical");
    expect(rule).toContain("overflow: hidden");
  });
});

describe("venue page", () => {
  it("renders Kern's with its logo, Coming up, the Past events rule and rows to permalinks", async () => {
    const ui = await VenuePage({ params: Promise.resolve({ key: "kerns" }) });
    const { container } = render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Kern's");
    expect(container.querySelector('img[src="/assets/venues/kerns.png"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Coming up" })).toBeInTheDocument();
    expect(container.querySelector(".ear-event-break")!.textContent).toBe("Past events");
    const rows = container.querySelectorAll(".ear-event-row");
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      const href = row.querySelector("a.ear-event-title")!.getAttribute("href")!;
      expect(href).toMatch(/^\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+$/);
      expect(row.querySelector(".ear-event-time")!.textContent).toBeTruthy();
    }
  });
  it("Ijams Nature Center has a page today, with no logo yet", async () => {
    const ui = await VenuePage({ params: Promise.resolve({ key: "ijams-nature-center" }) });
    render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ijams Nature Center");
  });
});

describe("place page", () => {
  it("groups Old Sevier by episode, newest first, with the lexicon line", async () => {
    const ui = await PlacePage({ params: Promise.resolve({ key: "old-sevier" }) });
    const { container } = render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Old Sevier");
    expect(screen.getByText(/Sevier Avenue corridor/)).toBeInTheDocument();
    const heads = [...container.querySelectorAll("h2")].map((h) => h.textContent!);
    expect(heads[0]).toMatch(/^No\. \d+ · /);
    const numbers = heads.map((h) => Number(h.match(/No\. (\d+)/)![1]));
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);
  });
});

describe("day page", () => {
  it("this Saturday first, then 'Last Saturday' after a rule, then a load-more link to ?weeks=2", async () => {
    const ui = await DayPage({ params: Promise.resolve({ weekday: "sat" }), searchParams: Promise.resolve({}) });
    const { container } = render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Saturday");
    const breaks = [...container.querySelectorAll(".ear-event-break")].map((b) => b.textContent);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toMatch(/^Last Saturday · [A-Z][a-z]{2} \d+$/);
    expect(screen.getByRole("link", { name: "Load more Saturdays" })).toHaveAttribute("href", "/day/sat?weeks=2");
  });
  it("?weeks=3 shows three past weeks", async () => {
    const ui = await DayPage({ params: Promise.resolve({ weekday: "fri" }), searchParams: Promise.resolve({ weeks: "3" }) });
    const { container } = render(ui);
    expect(container.querySelectorAll(".ear-event-break")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Load more Fridays" })).toHaveAttribute("href", "/day/fri?weeks=4");
  });
});

describe("search page", () => {
  it("empty query: the field and a hint; a query: tagged one-line results", async () => {
    const empty = render(await SearchPage({ searchParams: Promise.resolve({}) }));
    expect(empty.getByRole("searchbox")).toBeInTheDocument();
    expect(empty.getByText(/A venue, a corner of SoKno/)).toBeInTheDocument();
    empty.unmount();
    const { container } = render(await SearchPage({ searchParams: Promise.resolve({ q: "kern" }) }));
    expect(screen.getByRole("heading", { name: "Venues" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Places" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Articles" })).toBeInTheDocument();
    // Kern's is a venue and a place pill, so it shows up once in each list
    const kerns = screen.getAllByRole("link", { name: "Kern's" }).map((a) => a.getAttribute("href"));
    expect(kerns).toEqual(["/venue/kerns", "/place/kerns"]);
    expect(container.textContent).toMatch(/No\. \d+ · /);
  });
});

describe("Masthead search and day chips", () => {
  it("has a GET form to /search in the nav and a phone copy; day chips are links to the day pages", () => {
    const { container } = render(
      <Masthead volLine="Vol. 1 — No. 1" dateline="x" shortDate="Jun 19–21" sections={[{ id: "events", label: "Events" }]} days={["Thu", "Sat"]} />
    );
    const forms = container.querySelectorAll('form[action="/search"][method="get"]');
    expect(forms).toHaveLength(2);
    expect(forms[0].querySelector('input[type="search"][name="q"]')).toBeTruthy();
    expect(container.querySelector("nav form.ear-nav-search")).toBeTruthy();
    expect(container.querySelector("form.ear-nav-search--phone")).toBeTruthy();
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Thu" })).toHaveAttribute("href", "/day/thu");
    expect(screen.getByRole("link", { name: "Sat" })).toHaveAttribute("href", "/day/sat");
    expect(container.querySelector(".ear-daynav")).toBeTruthy();
  });
});
