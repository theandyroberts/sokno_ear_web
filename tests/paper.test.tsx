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
});
