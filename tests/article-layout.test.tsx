import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Article } from "@/components/ds/Article.jsx";

function figureFloat(layout: string) {
  const { container } = render(
    <Article label="L" title="T" image="/x.png" layout={layout as any}><p>b</p></Article>
  );
  const fig = container.querySelector("figure")!;
  return fig.style.float;
}

describe("Article layout variants", () => {
  it("imageLeft floats left", () => expect(figureFloat("imageLeft")).toBe("left"));
  it("imageRight floats right", () => expect(figureFloat("imageRight")).toBe("right"));
  it("imageTop does not float", () => expect(figureFloat("imageTop")).toBe("none"));
  it("textOnly renders no figure", () => {
    const { container } = render(<Article label="L" title="T" layout="textOnly"><p>b</p></Article>);
    expect(container.querySelector("figure")).toBeNull();
  });
});
