import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleBody } from "@/components/ArticleBody";
import { ArticleSources } from "@/components/ArticleSources";

describe("agenda block", () => {
  it("renders agenda title and rows (time + activity)", () => {
    render(
      <ArticleBody
        blocks={[
          {
            type: "agenda",
            title: "Schedule",
            rows: [
              { time: "12:00 PM", what: "Vendors open" },
              { time: "6:00 PM", what: "Evening concert" },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("12:00 PM")).toBeInTheDocument();
    expect(screen.getByText("Evening concert")).toBeInTheDocument();
  });
});

describe("ArticleSources", () => {
  it("renders a linked source and a plain-text credit", () => {
    render(
      <ArticleSources
        sources={[
          { label: "soknopride.org", url: "https://soknopride.org" },
          { label: "Info from A. Roberts" },
        ]}
      />
    );
    expect(screen.getByText("soknopride.org").closest("a")?.getAttribute("href")).toBe(
      "https://soknopride.org"
    );
    expect(screen.getByText("Info from A. Roberts").closest("a")).toBeNull();
  });

  it("renders nothing when sources is empty or undefined", () => {
    const { container } = render(<ArticleSources sources={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
