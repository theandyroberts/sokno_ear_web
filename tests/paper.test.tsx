import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Paper } from "@/components/Paper";
import { EpisodeSchema } from "@/lib/schema";
import { promoteStory } from "@/lib/episodes";
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
    const { container } = render(<Paper episode={promoted} storyView />);
    expect(screen.getByText("New body.")).toBeInTheDocument();                     // the story runs full
    expect(screen.getByText("More From This Weekend")).toBeInTheDocument();        // siblings section
    const teaser = screen.getByRole("link", { name: /This week/ });                // old feature is now a teaser card
    expect(teaser).toHaveAttribute("href", `/${episode.slug}/${episode.feature.id}`);
    // the old feature's body must NOT render — that's what makes this page mostly its own story
    const featureBody = (fixture as any).feature.body[0].text;
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
