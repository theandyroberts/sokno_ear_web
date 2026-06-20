import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Paper } from "@/components/Paper";
import { EditionSchema } from "@/lib/schema";
import fixture from "@/tests/fixtures/editions/2026-06-20.json";

describe("Paper", () => {
  it("renders masthead dateline, scanner, a story section, and the footer tagline", () => {
    const edition = EditionSchema.parse(fixture);
    const { container } = render(<Paper edition={edition} />);
    expect(screen.getByText(/South Knoxville, all the way/i)).toBeInTheDocument(); // footer
    expect(screen.getByText("Top Stories & Events")).toBeInTheDocument();          // scanner header
    expect(container.querySelector(`#${edition.stories[0].id}`)).toBeTruthy();      // story anchor
  });
});
