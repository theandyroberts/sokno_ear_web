import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CalendarItem } from "@/components/ds/CalendarItem.jsx";
import { Paper } from "@/components/Paper";
import { EpisodeSchema } from "@/lib/schema";
import { calendarVenue, loadVenues } from "@/lib/venues";
import fixture from "@/tests/fixtures/episodes/2026-06-20.json";

const registry = loadVenues();

describe("CalendarItem — venue tile", () => {
  it("draws the venue's logo on the tile when it has one", () => {
    const { container } = render(
      <CalendarItem title="Pint night" meta="All-day happy hour" href="#pint" logo="/assets/venues/hi-wire.svg" logoTreatment="ink-recolor" venueName="Hi-Wire Brewing" />,
    );
    const tile = container.querySelector(".ear-cal-logo")!;
    expect(tile.getAttribute("aria-hidden")).toBe("true");
    expect(tile.getAttribute("data-treatment")).toBe("ink-recolor");
    expect(tile.querySelector("img")!.getAttribute("src")).toBe("/assets/venues/hi-wire.svg");
    expect(container.querySelector(".ear-cal-logo--wordmark")).toBeNull();
  });

  it("falls back to a wordmark tile naming the venue when there is no logo", () => {
    const { container } = render(
      <CalendarItem title="Closing night" meta="7:30 PM" href="#play" logo={null} venueName="Borderland Playhouse" />,
    );
    const tile = container.querySelector(".ear-cal-logo")!;
    expect(tile.classList.contains("ear-cal-logo--wordmark")).toBe(true);
    expect(tile.querySelector("img")).toBeNull();
    expect(tile.textContent).toBe("Borderland Playhouse");
  });

  it("puts the ★ and the → on a cue line under the meta, not beside the title", () => {
    const { container } = render(
      <CalendarItem title="Bird banding" meta="7:30 AM · free" starred href="#banding" venueName="Ijams Nature Center" />,
    );
    const cues = container.querySelector(".ear-cal-cues")!;
    expect(cues.textContent).toBe("★→");
    // The cue line is the last thing in the text column, after the meta...
    const column = cues.parentElement!;
    expect(column.lastElementChild).toBe(cues);
    expect(column.textContent!.indexOf("7:30 AM")).toBeLessThan(column.textContent!.indexOf("★"));
    // ...and nothing sits to the right of the text column any more.
    const row = container.firstElementChild!;
    expect(row.lastElementChild).toBe(column);
    expect(row.children).toHaveLength(2); // tile + column
  });

  it("draws no cue line for a plain row with nothing to cue", () => {
    const { container } = render(<CalendarItem title="Open mic" meta="8 PM" venueName="Earl's" />);
    expect(container.querySelector(".ear-cal-cues")).toBeNull();
    expect(container.firstElementChild!.tagName).toBe("DIV"); // no href → not a link
  });

  it("still accepts the old month/day props without drawing a date stamp", () => {
    const { container } = render(<CalendarItem month="OCT" day="29" title="Trivia" href="#t" venueName="Trailhead Beer Market" />);
    expect(container.textContent).not.toMatch(/OCT|29/);
  });
});

describe("calendarVenue — resolving a row's venue from its story", () => {
  const row = { title: "Pint night", meta: "All-day happy hour too · 2020 Barber St" };
  it("trusts the story's event location first", () => {
    const story = { title: "Pint night at Hi-Wire", label: "Old Sevier", event: { locationName: "Hi-Wire Brewing Knoxville" } };
    expect(calendarVenue(row, story, registry).venue?.name).toBe("Hi-Wire Brewing");
  });
  it("every Ijams location lands on Ijams Nature Center", () => {
    for (const locationName of ["Ijams River Landing", "Mead's Quarry, Ijams Nature Center", "Ijams Nature Playscape at Grayson Subaru Preserve", "Miller Education Building, Ijams Nature Center"]) {
      const story = { title: "x", label: "Ijams Nature Center", event: { locationName } };
      expect(calendarVenue({ title: "x" }, story, registry).venue?.name, locationName).toBe("Ijams Nature Center");
    }
  });
  it("falls back to a venue named in the row, then to the label", () => {
    expect(calendarVenue({ title: "Trivia at Trailhead", meta: "7 PM" }, { title: "Trivia", label: "Old Sevier" }, registry).venue?.name).toBe("Trailhead Beer Market");
    expect(calendarVenue({ title: "Fall market", meta: "10 AM" }, { title: "Fall market", label: "Old Sevier" }, registry).venue?.name).toBe("Old Sevier District");
    expect(calendarVenue({ title: "Fall market", meta: "10 AM" }, { title: "Fall market", label: "Suttree Landing" }, registry)).toEqual(expect.objectContaining({ name: "Suttree Landing Park" }));
  });
  it("reads the row title before the drinks in the meta, so Earl's mimosas don't resolve to Mimosas", () => {
    const story = { title: "Earl's runs a rita a day through Halloween weekend, then mimosas for the morning after", label: "Suttree Landing" };
    expect(calendarVenue({ title: "$10 Patrón mango ritas at Earl's", meta: "11 AM – 10 PM · a rita a day through Saturday" }, story, registry).venue?.name).toBe("Earl's");
    expect(calendarVenue({ title: "Seven-dollar mimosas and Bloody Marys at Earl's", meta: "All day" }, story, registry).venue?.name).toBe("Earl's");
  });
  it("names the place for the wordmark when nothing is registered", () => {
    const story = { title: "Zoning hearing", label: "SoKno", event: { locationName: "City County Building — Main Assembly Room" } };
    expect(calendarVenue({ title: "Zoning hearing" }, story, registry)).toEqual({ venue: null, name: "City County Building — Main Assembly Room" });
    expect(calendarVenue({ title: "Twilight Trivia", meta: "7:00 PM · on the screens" }, undefined, registry)).toEqual({ venue: null, name: "on the screens" });
  });
  it("the Old Sevier Market keeps its own mark — the district alias never steals it", () => {
    const story = { title: "Market day", label: "Old Sevier", event: { locationName: "Old Sevier Market" } };
    expect(calendarVenue({ title: "Market day" }, story, registry).venue?.name).toBe("Old Sevier Market");
  });
});

describe("Paper — calendar rows carry the venue tile and the day bar carries the date", () => {
  const episode = EpisodeSchema.parse(fixture);
  const story = { ...episode.stories[0], event: { startDate: "2026-06-20", locationName: "Hi-Wire Brewing Knoxville" } };
  const withVenue = {
    ...episode,
    stories: [story],
    sidebar: {
      ...episode.sidebar,
      calendar: [
        { month: "JUN", day: "20", title: "Pint night", meta: "All day", starred: true, href: `#${story.id}` },
        { month: "JUN", day: "20", title: "Something at the library", meta: "2pm", starred: false, href: `#${episode.feature.id}` },
      ],
    },
  };
  it("resolves each row's logo through its story, or sets the wordmark", () => {
    const { container } = render(<Paper episode={withVenue} />);
    const tiles = [...container.querySelectorAll(".ear-soon-aside .ear-cal-logo")];
    expect(tiles).toHaveLength(2);
    expect(tiles[0].querySelector("img")!.getAttribute("src")).toBe("/assets/venues/hi-wire.svg");
    expect(tiles[1].querySelector("img")).toBeNull();
    expect(tiles[1].textContent).toBe("Feature"); // the fixture feature's label, no venue
  });
  it("the day bar sets the weekday, the month and the day number as one lockup", () => {
    const { container } = render(<Paper episode={withVenue} />);
    const bar = container.querySelector(".ear-soon-aside .ear-daybar")!;
    expect(bar.textContent).toBe("Saturday · JUN 20");
    expect(bar.querySelector(".ear-daybar-weekday")!.textContent).toBe("Saturday");
    expect(bar.querySelector(".ear-daybar-day")!.textContent).toBe("20");
    // and the rows no longer repeat the date
    expect(container.querySelector(".ear-soon-aside .ear-cal-logo")!.textContent).not.toContain("20");
  });
});
