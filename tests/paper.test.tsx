import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Paper } from "@/components/Paper";
import { EpisodeSchema } from "@/lib/schema";
import fixture from "@/tests/fixtures/episodes/2026-06-20.json";

describe("Paper", () => {
  it("renders the masthead dateline, scanner grid, and a story section", () => {
    const episode = EpisodeSchema.parse(fixture);
    const { container } = render(<Paper episode={episode} />);
    expect(screen.getByText("Top Stories & Events")).toBeInTheDocument();          // scanner header
    expect(container.querySelector(`#${episode.stories[0].id}`)).toBeTruthy();      // story anchor
  });
});
