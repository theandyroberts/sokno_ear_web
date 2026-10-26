import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { EventRow } from "@/components/EventRow";
import { PastEvents } from "@/components/PastEvents";
import { Flourish } from "@/components/ds/Flourish";
import { Masthead } from "@/components/Masthead";
import VenuePage from "@/app/venue/[key]/page";
import PlacePage from "@/app/place/[key]/page";
import DayPage from "@/app/day/[weekday]/page";
import SearchPage, { generateMetadata as searchMetadata } from "@/app/search/page";
import type { ArticleEntry } from "@/lib/search";

const article: ArticleEntry = {
  slug: "2026-10-28", storyId: "halloween-808", href: "/2026-10-28/halloween-808",
  title: "A very long headline that would certainly need more than two lines on a phone and so gets an ellipsis at the end of line two",
  label: "Old Sevier", labelColor: "rust", categoryKey: "old-sevier", venueKey: "the-808", venueName: "The 808",
  image: "/assets/spots/x.jpg", ticket: { href: "https://tickets.example.com/808", image: "/assets/tickets/808.svg", alt: "Tickets for the 808 show" },
  startDate: "2026-10-31T19:00:00-04:00", eventStart: "2026-10-31T19:00:00-04:00", episodeNumber: 20, episodeDate: "2026-10-28",
  episodeShortDate: "Oct 29–Nov 1", allDay: false, text: "",
};

/** The columns of a row, left to right, by class. */
const columns = (row: Element) => [...row.children].map((c) => c.className.split(" ")[0]);

describe("EventRow", () => {
  it("date column first (day over time), then thumbnail and headline to the article, then the ticket to a new tab — no type word", () => {
    const { container } = render(<ul><EventRow article={article} sub="No. 20 · The 808" upcoming /></ul>);
    const row = container.querySelector(".ear-event-row")!;
    expect(columns(row)).toEqual(["ear-event-date", "ear-event-thumb", "ear-event-text", "ear-ticket-link"]);
    expect(row.className).toContain("ear-event-row--upcoming");
    expect(row.querySelector(".ear-event-day")!.textContent).toBe("Sat Oct 31");
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
    expect(row.querySelector(".ear-event-sub")!.textContent).toBe("No. 20 · The 808");
    expect(row.textContent).not.toMatch(/article/i);
  });
  it("no image → the ★ placeholder tile; no ticket → no ticket link; no event → the episode's day and a dash; a past row is marked", () => {
    const { container } = render(
      <ul><EventRow article={{ ...article, image: undefined, ticket: undefined, eventStart: undefined, startDate: "2026-10-28" }} sub="Oct 29–Nov 1" upcoming={false} /></ul>,
    );
    const row = container.querySelector(".ear-event-row")!;
    expect(row.className).toContain("ear-event-row--past");
    expect(row.querySelector("a.ear-event-thumb .ear-event-thumb-blank")!.textContent).toBe("★");
    expect(container.querySelector(".ear-event-ticket")).toBeNull();
    expect(row.querySelector(".ear-event-day")!.textContent).toBe("Wed Oct 28");
    expect(row.querySelector(".ear-event-time")!.textContent).toBe("—");
  });
  it("works out upcoming from today's date when the page does not say", () => {
    const soon = { ...article, startDate: "2099-01-01T19:00:00-05:00", eventStart: "2099-01-01T19:00:00-05:00" };
    const gone = { ...article, startDate: "2020-01-01T19:00:00-05:00", eventStart: "2020-01-01T19:00:00-05:00" };
    const { container } = render(<ul><EventRow article={soon} sub="" /><EventRow article={gone} sub="" /></ul>);
    const rows = container.querySelectorAll(".ear-event-row");
    expect(rows[0].className).toContain("--upcoming");
    expect(rows[1].className).toContain("--past");
  });
});

describe("PastEvents", () => {
  const rows = (n: number) => <ul>{Array.from({ length: n }, (_, i) => <li key={i}>row {i}</li>)}</ul>;
  it("starts collapsed with the fade and the button; one click opens it and the fade goes", () => {
    const { container } = render(<PastEvents count={12}>{rows(12)}</PastEvents>);
    expect(container.querySelector(".ear-past--closed")).toBeTruthy();
    expect(container.querySelector(".ear-past-fade")).toBeTruthy();
    expect(container.querySelectorAll("li")).toHaveLength(12); // the rows are all there, only clipped
    const button = screen.getByRole("button", { name: "Click to see the old stuff" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(container.querySelector(".ear-past--open")).toBeTruthy();
    expect(container.querySelector(".ear-past-fade")).toBeNull();
    expect(screen.queryByRole("button", { name: "Click to see the old stuff" })).toBeNull();
  });
  it("three rows or fewer never collapse; defaultOpen opens it from the start", () => {
    const few = render(<PastEvents count={3}>{rows(3)}</PastEvents>);
    expect(few.container.querySelector(".ear-past--open")).toBeTruthy();
    expect(few.queryByRole("button")).toBeNull();
    few.unmount();
    const open = render(<PastEvents count={9} defaultOpen>{rows(9)}</PastEvents>);
    expect(open.container.querySelector(".ear-past--open")).toBeTruthy();
  });
  it("collapses to about three rows in globals.css and fades to the page cream", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("app/globals.css", "utf8");
    const well = css.match(/\.ear-past--closed \.ear-past-well \{[^}]*\}/)![0];
    expect(well).toMatch(/max-height: 2\d\dpx/);
    expect(well).toContain("overflow: hidden");
    expect(well).toMatch(/[^-]mask-image: linear-gradient\(to bottom, #000 0%, #000 \d+%, transparent \d+%\)/);
    expect(css).toMatch(/\.ear-past-fade \{[^}]*position: absolute[^}]*bottom: 0/);
    expect(css).toMatch(/\.ear-past-reveal \{[^}]*color: var\(--rust\)[^}]*text-decoration: underline/);
  });
});

describe("Flourish", () => {
  it("is a decorative separator: hairlines either side of an inline SVG in the current ink", () => {
    const { container } = render(<Flourish />);
    const root = container.querySelector(".ear-flourish")!;
    expect(root.getAttribute("role")).toBe("separator");
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector("svg")).toBeTruthy();
    expect(root.querySelector("svg")!.getAttribute("stroke")).toBe("currentColor");
    expect(root.querySelectorAll(":scope > span")).toHaveLength(2);
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

/** Every row on a results page: a date column with a day and a time, a thumbnail (art or ★), a headline to a permalink. */
function expectRowShape(container: HTMLElement) {
  const rows = container.querySelectorAll(".ear-event-row");
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(columns(row).slice(0, 3)).toEqual(["ear-event-date", "ear-event-thumb", "ear-event-text"]);
    expect(row.querySelector(".ear-event-day")!.textContent).toMatch(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2}$/);
    expect(row.querySelector(".ear-event-time")!.textContent).toMatch(/^(\d{1,2}(:\d{2})? [AP]M|all day|—)$/);
    expect(row.querySelector(".ear-event-thumb img, .ear-event-thumb .ear-event-thumb-blank")).toBeTruthy();
    const href = row.querySelector("a.ear-event-title")!.getAttribute("href")!;
    expect(href).toMatch(/^\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+$/);
  }
  return rows;
}

/** The two halves of a results page: Coming up, the flourish, See past events, and the past folded. */
function expectTwoHalves(container: HTMLElement, first = "Coming up") {
  expect(screen.getByRole("heading", { name: first })).toBeInTheDocument();
  const flourish = container.querySelector(".ear-past-break .ear-flourish svg");
  expect(flourish).toBeTruthy();
  const pastHeading = screen.getByRole("heading", { name: "See past events" });
  expect(pastHeading.className).toBe("ear-results-h2");
  // the flourish comes before the past heading, and after the coming-up section
  expect(flourish!.compareDocumentPosition(pastHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const comingUp = screen.getByRole("heading", { name: first });
  expect(comingUp.compareDocumentPosition(flourish!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // past rows are inside the fold, newest first, all marked past
  const past = container.querySelector(".ear-past")!;
  const pastRows = [...past.querySelectorAll(".ear-event-row")];
  for (const r of pastRows) expect(r.className).toContain("ear-event-row--past");
  // nothing upcoming lives outside the fold
  const upcomingRows = [...container.querySelectorAll(".ear-event-row--upcoming")];
  for (const r of upcomingRows) expect(past.contains(r)).toBe(false);
  return { past, pastRows };
}

describe("venue page", () => {
  it("renders Kern's with its logo, Coming up, the filigree, See past events and rows to permalinks", async () => {
    const ui = await VenuePage({ params: Promise.resolve({ key: "kerns" }) });
    const { container } = render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Kern's");
    expect(container.querySelector('header img[src="/assets/venues/kerns.png"]')).toBeTruthy();
    expect(expectRowShape(container).length).toBeGreaterThan(10);
    const { pastRows } = expectTwoHalves(container);
    expect(pastRows.length).toBeGreaterThan(3);
    expect(container.querySelector(".ear-past--closed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Click to see the old stuff" })).toBeInTheDocument();
    // the venue is a given here, so the dim line carries the episode and the place pill
    expect(pastRows[0].querySelector(".ear-event-sub")!.textContent).toMatch(/^No\. \d+ · /);
    expect(container.textContent).not.toMatch(/\bArticle\b/);
  });
  it("Ijams Nature Center has a page today, with no logo yet", async () => {
    const ui = await VenuePage({ params: Promise.resolve({ key: "ijams-nature-center" }) });
    render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ijams Nature Center");
  });
});

describe("place page", () => {
  it("Old Sevier: the lexicon line, Coming up, then the past newest first behind the fold", async () => {
    const ui = await PlacePage({ params: Promise.resolve({ key: "old-sevier" }) });
    const { container } = render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Old Sevier");
    expect(screen.getByText(/Sevier Avenue corridor/)).toBeInTheDocument();
    expectRowShape(container);
    const { pastRows } = expectTwoHalves(container);
    const subs = pastRows.map((r) => r.querySelector(".ear-event-sub")!.textContent!);
    for (const s of subs) expect(s).toMatch(/^No\. \d+/);
    const numbers = subs.map((s) => Number(s.match(/No\. (\d+)/)![1]));
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);
  });
});

describe("day page", () => {
  it("this Saturday first, then the filigree, 'Last Saturday' inside the fold, and the load-more link at its foot", async () => {
    const ui = await DayPage({ params: Promise.resolve({ weekday: "sat" }), searchParams: Promise.resolve({}) });
    const { container } = render(ui);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Saturday");
    expectRowShape(container);
    const { past } = expectTwoHalves(container, "This Saturday");
    const breaks = [...past.querySelectorAll(".ear-event-break")].map((b) => b.textContent);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toMatch(/^Last Saturday · [A-Z][a-z]{2} \d+$/);
    const more = screen.getByRole("link", { name: "Load more Saturdays" });
    expect(more).toHaveAttribute("href", "/day/sat?weeks=2");
    expect(past.contains(more)).toBe(true);
    expect(container.querySelector(".ear-past--closed")).toBeTruthy();
  });
  it("?weeks=3 shows three past weeks, already unfolded", async () => {
    const ui = await DayPage({ params: Promise.resolve({ weekday: "fri" }), searchParams: Promise.resolve({ weeks: "3" }) });
    const { container } = render(ui);
    expect(container.querySelectorAll(".ear-event-break")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Load more Fridays" })).toHaveAttribute("href", "/day/fri?weeks=4");
    expect(container.querySelector(".ear-past--open")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Click to see the old stuff" })).toBeNull();
  });
});

describe("search page", () => {
  it("empty query: 'Search the Ear', the field and a hint", async () => {
    const { getByRole, getByText } = render(await SearchPage({ searchParams: Promise.resolve({}) }));
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Search the Ear");
    expect(getByRole("searchbox")).toBeInTheDocument();
    expect(getByText(/A venue, a corner of SoKno/)).toBeInTheDocument();
    expect((await searchMetadata({ searchParams: Promise.resolve({}) })).title).toBe("Search the Ear — The South Knoxville Ear");
  });
  it("a query: '— results' up top, in the heading and the title", async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: "forest" }) }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Search the Ear — results");
    expect((await searchMetadata({ searchParams: Promise.resolve({ q: "forest" }) })).title).toBe("Search the Ear — results — The South Knoxville Ear");
  });
  it("'kern': the venue with its logo tile and the place as a pill above the events, then the two halves", async () => {
    const { container } = render(await SearchPage({ searchParams: Promise.resolve({ q: "kern" }) }));
    expect(screen.getByRole("heading", { name: "Venues" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Places" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Articles" })).toBeNull();
    expect(container.querySelector('.ear-venue-tile img[src="/assets/venues/kerns.png"]')).toBeTruthy();
    // Kern's is a venue and a place pill, so it shows up once in each list
    const kerns = screen.getAllByRole("link", { name: "Kern's" }).map((a) => a.getAttribute("href"));
    expect(kerns).toEqual(["/venue/kerns", "/place/kerns"]);
    expectRowShape(container);
    const { past } = expectTwoHalves(container);
    const venues = screen.getByRole("heading", { name: "Venues" });
    expect(venues.compareDocumentPosition(past) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toMatch(/No\. \d+ · /);
    expect(container.textContent).not.toMatch(/\bArticle\b/);
    expect(past.querySelectorAll(".ear-event-row").length).toBeGreaterThan(0);
  });
  it("nothing matches: one line", async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: "zzzqqq" }) }));
    expect(screen.getByText(/Nothing in the Ear for/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "See past events" })).toBeNull();
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
