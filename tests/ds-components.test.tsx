import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/ds/SectionHeader.jsx";
import { StoryCard } from "@/components/ds/StoryCard.jsx";

describe("DS components render", () => {
  it("SectionHeader shows its rubric", () => {
    render(<SectionHeader>Top Stories</SectionHeader>);
    expect(screen.getByText("Top Stories")).toBeInTheDocument();
  });
  it("StoryCard shows title + jump cue", () => {
    render(<StoryCard image="/x.png" title="Pride" blurb="b" cue="Jump to story" href="#pride" />);
    expect(screen.getByText("Pride")).toBeInTheDocument();
    expect(screen.getByText(/Jump to story/)).toBeInTheDocument();
  });
});
