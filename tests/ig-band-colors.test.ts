// @vitest-environment node
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

// band_colors lives in scripts/ig-banners.py, beside the drawing it decides. Ask Python.
const script = path.join(__dirname, "..", "scripts", "ig-banners.py");
function bandColors(stories: unknown[]): Record<string, string> {
  const code = [
    "import importlib.util, json, sys",
    `spec = importlib.util.spec_from_file_location("igb", ${JSON.stringify(script)})`,
    "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
    "print(json.dumps(m.band_colors(json.loads(sys.stdin.read()))))",
  ].join("\n");
  return JSON.parse(execFileSync("python3", ["-c", code], { input: JSON.stringify(stories), encoding: "utf8" }));
}
let python = true;
try { execFileSync("python3", ["-c", "import PIL"], { stdio: "ignore" }); } catch { python = false; }

const story = (id: string, labelColor: string, social: Record<string, unknown> = {}) =>
  ({ id, labelColor, image: `/assets/spots/${id}.jpg`, social: { igBanner: ["Line one", "line two"], ...social } });
const count = (colors: Record<string, string>) => Object.values(colors).reduce<Record<string, number>>((n, c) => ({ ...n, [c]: (n[c] ?? 0) + 1 }), {});

describe.skipIf(!python)("banner band colors", () => {
  it("gives a place its own color once, then spreads the rest across the palette", () => {
    const ijams = Array.from({ length: 9 }, (_, i) => story(`ijams-${i}`, "teal"));
    const colors = bandColors(ijams);
    expect(colors["ijams-0"]).toBe("teal");
    expect(colors["ijams-1"]).toBe("gold");
    expect(count(colors)).toEqual({ teal: 1, gold: 2, rust: 2, green: 2, ink: 2 });
  });

  it("replays No. 15: nine teal banners out of twelve become two", () => {
    const week = [
      story("end-of-summer-jam", "teal"), story("harvest-moon-paddle", "teal"), story("cyanotype-day", "teal"),
      story("puckers-texas", "rust"), story("kerns-tailgate", "green"), story("playing-possum", "teal"),
      story("bats-after-dark", "teal"), story("urban-wilderness-cool", "ink"), story("renew-in-nature", "teal"),
      story("wildflower-walk", "teal"), story("stained-glass", "teal"), story("hooping", "teal"),
    ];
    const colors = bandColors(week);
    const n = count(colors);
    expect(n.teal).toBeLessThanOrEqual(3);
    expect(Math.max(...Object.values(n)) - Math.min(...Object.values(n))).toBeLessThanOrEqual(1);
    // Every other place still opens in its own color.
    expect(colors).toMatchObject({ "end-of-summer-jam": "teal", "puckers-texas": "rust", "kerns-tailgate": "green", "urban-wilderness-cool": "ink" });
  });

  it("lets a story name its color outright", () => {
    const colors = bandColors([story("a", "teal"), story("b", "teal", { igBand: "ink" }), story("c", "teal", { igBand: "chartreuse" })]);
    expect(colors.b).toBe("ink");
    expect(colors.c).toBe("gold"); // not a palette color, so it takes its turn
  });

  it("skips stories that get no banner, without spending a color on them", () => {
    const colors = bandColors([story("a", "teal"), { id: "no-banner", labelColor: "teal", image: "/x.jpg" }, story("b", "teal")]);
    expect(colors).toEqual({ a: "teal", b: "gold" });
  });
});
