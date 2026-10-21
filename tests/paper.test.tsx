import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Paper } from "@/components/Paper";
import { EpisodeSchema } from "@/lib/schema";
import { promoteStory } from "@/lib/episodes";
import currentEpisode from "@/content/episodes/2026-10-21.json";
import fixture from "@/tests/fixtures/episodes/2026-06-20.json";

describe("Paper", () => {
  it("renders the masthead dateline, scanner grid, and a story section", () => {
    const episode = EpisodeSchema.parse(fixture);
    const { container } = render(<Paper episode={episode} />);
    expect(screen.getByText("Top Stories & Events")).toBeInTheDocument();          // scanner header
    expect(container.querySelector(`#${episode.stories[0].id}`)).toBeTruthy();      // story anchor
  });
  it("storyView runs the story full and renders siblings as teaser links, not full articles", () => {
    const episode = EpisodeSchema.parse(fixture);
    const promoted = promoteStory(episode, episode.stories[0].id)!;               // /slug/new-thing
    render(<Paper episode={promoted} storyView />);
    expect(screen.getByText("New body.")).toBeInTheDocument();                     // the story runs full
    expect(screen.getByText("More From This Weekend")).toBeInTheDocument();        // siblings section
    const teaser = screen.getByRole("link", { name: /This week/ });                // old feature is now a teaser card
    expect(teaser).toHaveAttribute("href", `/${episode.slug}/${episode.feature.id}`);
    // the old feature's body must NOT render — that's what makes this page mostly its own story
    const featureBody = fixture.feature.body[0].text;
    expect(screen.queryByText(featureBody)).not.toBeInTheDocument();
  });
  it("storyView shows exactly one set of cards — the scanner grid is episode-page only", () => {
    const episode = EpisodeSchema.parse(fixture);
    const promoted = promoteStory(episode, episode.stories[0].id)!;
    render(<Paper episode={promoted} storyView />);
    // A shared story link used to render BOTH the full scanner (every card, including
    // one for the story you're already reading) and the sibling teasers below it.
    expect(screen.queryByText("Top Stories & Events")).not.toBeInTheDocument();
    expect(screen.getByText("More From This Weekend")).toBeInTheDocument();
    // and no card links back to the story this page already is
    const selfLinks = screen.queryAllByRole("link", { name: new RegExp(promoted.feature.title.slice(0, 20), "i") })
      .filter((a) => a.getAttribute("href")?.endsWith(`/${promoted.feature.id}`));
    expect(selfLinks).toHaveLength(0);
  });
});

describe("Paper — long calendars", () => {
  const episode = EpisodeSchema.parse(fixture);
  // A calendar long enough to run past the feature: the fixture's rows repeated across
  // four dates, ordered like a real episode (Thu → Sun).
  const days = ["18", "19", "20", "21"]; // Jun 18–21, 2026 is Thu–Sun
  const longCalendar = days.flatMap((day) =>
    Array.from({ length: 4 }, (_, i) => ({ ...episode.sidebar.calendar[0], month: "JUN", day, title: `Row ${day}-${i}` })),
  );
  const long = { ...episode, sidebar: { ...episode.sidebar, calendar: longCalendar } };

  it("heads each new date in the calendar with a weekday bar", () => {
    const { container } = render(<Paper episode={long} />);
    const bars = [...container.querySelectorAll(".ear-soon-aside .ear-daybar")].map((b) => b.textContent);
    expect(bars).toEqual(["Thursday · JUN 18", "Friday · JUN 19", "Saturday · JUN 20", "Sunday · JUN 21"]);
    // each bar is tagged with its weekday so the day filter can show just one
    expect(container.querySelector(".ear-soon-aside .ear-daybar")!.getAttribute("data-days")).toBe("thu");
  });

  it("lifts the first stories into the feature band when the calendar runs long, and not otherwise", () => {
    const { container, unmount } = render(<Paper episode={long} />);
    const main = container.querySelector(".ear-maincol")!;
    expect(main.querySelector(`#${episode.stories[0].id}`)).toBeTruthy();   // 16 rows → one lifted
    expect(main.querySelectorAll("section").length).toBe(1);               // and only one
    expect(container.querySelectorAll(`section#${episode.stories[0].id}`).length).toBe(1); // and not repeated below
    unmount();
    const short = render(<Paper episode={episode} />);
    expect(short.container.querySelector(".ear-maincol section")).toBeNull(); // short calendar → nothing lifted
    expect(short.container.querySelector(`#${episode.stories[0].id}`)).toBeTruthy();
  });

  it("story permalinks never lift siblings", () => {
    const { container } = render(<Paper episode={promoteStory(long, long.stories[0].id)!} storyView />);
    expect(container.querySelector(".ear-maincol section")).toBeNull();
  });
});


describe("Paper — standalone article sidebar", () => {
  const episode = EpisodeSchema.parse(currentEpisode);

  it("orders the compact sidebar and omits the roster and day filter only on article routes", () => {
    const { container } = render(<Paper episode={promoteStory(episode, "big-pink-house-party")!} storyView />);
    const aside = container.querySelector("aside")!;
    const dirtySouth = aside.querySelector(".ds-card-desktop")!;
    const signup = within(aside).getByRole("textbox", { name: "Email address" });
    const audio = aside.querySelector("audio")!;
    const fullIssue = within(aside).getByRole("link", { name: /^Home$/ });
    expect(dirtySouth.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(signup.compareDocumentPosition(audio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(audio.compareDocumentPosition(fullIssue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fullIssue).toHaveAttribute("href", "/");
    expect(container.querySelector(".ear-soon-aside, .ear-dayboard, .ear-daynav")).toBeNull();
    expect(container.querySelector(".ear-belowfeature form")).toBeTruthy();
    expect(screen.getByText("More From This Weekend")).toBeInTheDocument();
    const emailIds = [...container.querySelectorAll('input[type="email"][name="subscribe-email"]')].map(i => i.id);
    expect(emailIds).toHaveLength(3);
    expect(new Set(emailIds).size).toBe(3);
  });

  it("keeps the full issue calendar, day filters, and existing signup placements", () => {
    const { container } = render(<Paper episode={episode} />);
    expect(container.querySelector(".ear-soon-aside .ear-daybar")).toBeTruthy();
    expect(container.querySelector(".ear-dayboard")).toBeTruthy();
    expect(container.querySelector(".ear-daynav")).toBeTruthy();
    expect(container.querySelector("aside form, .ear-home-link")).toBeNull();
    expect(container.querySelectorAll('input[name="subscribe-email"]')).toHaveLength(2);
  });
});
