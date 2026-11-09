import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Article } from "@/components/ds/Article.jsx";
import { ArticleBody } from "@/components/ArticleBody";
import { storyVenue } from "@/lib/search";
import { loadVenues } from "@/lib/venues";

const body = [{ type: "paragraph" as const, text: "The lede." }, { type: "paragraph" as const, text: "More." }];
const facts = [{ label: "When", value: "Thu 7 PM" }, { label: "Where", value: "The 808" }];
const ticket = { href: "https://808knox.com/", image: "/assets/spots/the-808-tickets.svg", alt: "Get tickets at The 808" };

// Andy, 2026-11-09: "add the framed venue logo into the when/where/ages box for every story.
// lay it out to look good with or without a ticket link in the story."
describe("the venue's framed mark in the facts box", () => {
  const registry = loadVenues();

  it("resolves from the event's location, or an explicit venueKey for a story with no event", () => {
    expect(storyVenue({ event: { locationName: "Hi-Wire Brewing Knoxville" } }, registry)?.key).toBe("hi-wire");
    expect(storyVenue({ event: { locationName: "Eggspectation at Kern's" } }, registry)?.key).toBe("kerns");
    expect(storyVenue({ event: { locationName: "UpTop at Kern's" } }, registry)?.key).toBe("kerns");
    expect(storyVenue({ venueKey: "earls" }, registry)).toMatchObject({ key: "earls", name: "Earl's", logo: "/assets/venues/earls.png" });
    expect(storyVenue({}, registry)).toBeNull();
    // a place with no registry entry still gets a page key and a wordmark
    expect(storyVenue({ event: { locationName: "Borderland Playhouse" } }, registry)).toMatchObject({ key: "borderland-playhouse", logo: null });
  });

  it("sits in the box with the facts, links to the venue page, and the ticket follows it", () => {
    const venue = storyVenue({ event: { locationName: "The 808" } }, registry)!;
    const { container } = render(
      <Article title="A show" facts={facts} ticket={ticket} venue={venue}><ArticleBody blocks={body} /></Article>,
    );
    const box = container.querySelector(".ear-facts-box")!;
    expect(box.className).toBe("ear-facts-box ear-facts-box--logo ear-facts-box--ticket");
    expect(box.parentElement!.className).toBe("ear-facts-wrap");
    const mark = screen.getByRole("link", { name: "The 808: every story in the Ear" });
    expect(mark).toHaveAttribute("href", "/venue/the-808");
    expect(mark.querySelector("img")).toHaveAttribute("src", "/assets/venues/the-808.png");
    const dl = container.querySelector("dl")!;
    const ticketLink = screen.getByRole("link", { name: /Get tickets at The 808/ });
    expect(mark.compareDocumentPosition(dl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dl.compareDocumentPosition(ticketLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the box still follows the lede
    const ps = [...container.querySelectorAll("p")];
    expect(ps[0].compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box.compareDocumentPosition(ps[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("without a ticket the box has the mark and the facts; without a logo the tile carries the name", () => {
    const { container } = render(
      <Article title="A play" facts={facts} venue={{ key: "borderland-playhouse", name: "Borderland Playhouse", logo: null }}><ArticleBody blocks={body} /></Article>,
    );
    const box = container.querySelector(".ear-facts-box")!;
    expect(box.className).toBe("ear-facts-box ear-facts-box--logo");
    const mark = screen.getByRole("link", { name: "Borderland Playhouse: every story in the Ear" });
    expect(mark.className).toContain("ear-venue-mark--wordmark");
    expect(mark.textContent).toBe("Borderland Playhouse");
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("a story with no venue draws the plain box", () => {
    const { container } = render(<Article title="Murals" facts={facts}><ArticleBody blocks={body} /></Article>);
    expect(container.querySelector(".ear-facts-box")!.className).toBe("ear-facts-box");
    expect(container.querySelector(".ear-venue-mark")).toBeNull();
  });
});
