import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleBody } from "@/components/ArticleBody";

describe("ArticleBody", () => {
  it("renders plain paragraph", () => {
    render(<ArticleBody blocks={[{ type: "paragraph", text: "Hello SoKno" }]} />);
    expect(screen.getByText("Hello SoKno")).toBeInTheDocument();
  });
  it("renders bold/italic/link runs", () => {
    render(<ArticleBody blocks={[{ type: "paragraph", runs: [
      { text: "B", bold: true }, { text: "I", italic: true },
      { text: "L", href: "https://x.com" },
    ] }]} />);
    expect(screen.getByText("B").tagName).toBe("STRONG");
    expect(screen.getByText("I").tagName).toBe("EM");
    expect(screen.getByText("L").closest("a")?.getAttribute("href")).toBe("https://x.com");
  });
  it("renders a subhead as h3", () => {
    render(<ArticleBody blocks={[{ type: "subhead", text: "Later" }]} />);
    expect(screen.getByText("Later").tagName).toBe("H3");
  });
});
