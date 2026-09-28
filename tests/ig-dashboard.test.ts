// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validate, renderRun, renderRail, intoPage, spark, dial, MAX_MOVES } from "../scripts/ig-dashboard.mjs";

const data = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "ig-reviews", "data", "2026-09-28.json"), "utf8"));

const PAGE = `<html><head><style>.x{}</style></head><body>
<ul class="runs">
      <li><a href="#run-08" class="run active" data-run="run-08">
        <span class="rdate"><span class="dot"></span> 2026-09-21</span>
      </a></li>
</ul>
    <nav class="rail-jump" data-jump="run-08">
      <a href="#r8-numbers">The numbers</a>
    </nav>
<main><div class="inner">
      <div class="runview" id="run-08">
      old
      </div><!-- /run-08 -->
</div></main>
<script>/* switcher */</script>
</body></html>`;

describe("the dashboard's rules", () => {
  it("accepts the run that set them", () => {
    expect(validate(data())).toEqual([]);
  });

  it(`refuses a fourth move`, () => {
    const d = data();
    d.moves.push({ ...d.moves[0], key: "one-more" });
    expect(d.moves.length).toBe(MAX_MOVES + 1);
    expect(validate(d).join(" ")).toMatch(/moves: one to 3/);
  });

  it("refuses a lettered ticket anywhere a person reads", () => {
    const d = data();
    d.moves[1].title = "A11 — venue outreach";
    expect(validate(d).join(" ")).toMatch(/lettered ticket \(A11\)/);
  });

  it("refuses a reason that runs long, and a headline that does", () => {
    const d = data();
    d.moves[0].why = Array(40).fill("word").join(" ");
    d.headline = Array(20).fill("word").join(" ");
    const bad = validate(d).join(" | ");
    expect(bad).toMatch(/reason is at most 28 words/);
    expect(bad).toMatch(/headline: at most 12 words/);
  });

  it("refuses a post with no picture", () => {
    const d = data();
    delete d.worked[0].img;
    d.week[3].img = "";
    const bad = validate(d).join(" | ");
    expect(bad).toMatch(/worked "Kern's lawn tailgates": no image/);
    expect(bad).toMatch(/post "wildflower-walk": no image/);
  });

  it("refuses a move with no owner or no date to hold it to", () => {
    const d = data();
    d.moves[0].owner = "pipeline";
    d.moves[2].plan = "";
    const bad = validate(d).join(" | ");
    expect(bad).toMatch(/owner is claude or andy/);
    expect(bad).toMatch(/say what happens and when/);
  });

  it("won't draw a run that breaks them", () => {
    const d = data();
    d.moves = [];
    expect(() => renderRun(d)).toThrow(/can't draw 2026-09-28/);
  });
});

describe("the drawing", () => {
  const html = renderRun(data());

  it("puts the picture before the moves, and the moves before the write-up", () => {
    const at = (s: string) => html.indexOf(s);
    expect(at('id="r9-glance"')).toBeGreaterThan(0);
    expect(at('id="r9-glance"')).toBeLessThan(at('id="r9-pictures"'));
    expect(at('id="r9-pictures"')).toBeLessThan(at('id="r9-moves"'));
  });

  it("shows every post of the week as an image", () => {
    expect(html.match(/class="g-cell-img"><img /g)).toHaveLength(14);
  });

  it("gives every move its answer buttons, fitted to whose move it is", () => {
    expect(html.match(/data-move="/g)).toHaveLength(3);
    const venue = html.slice(html.indexOf('data-move="venue-notes"'));
    expect(venue.slice(0, venue.indexOf("</article>"))).toMatch(/data-answer="done"[\s\S]*data-answer="later"/);
    const roundup = html.slice(html.indexOf('data-move="weekend-roundup"'));
    expect(roundup.slice(0, roundup.indexOf("</article>"))).toMatch(/data-answer="go"[\s\S]*data-answer="no"/);
  });

  it("escapes what the data file says", () => {
    const d = data();
    d.headline = `Reach <script>alert(1)</script> fell`;
    expect(renderRun(d)).not.toContain("<script>alert(1)");
  });

  it("colours a sparkline by whether the last step was the good direction", () => {
    expect(spark([1, 2, 3])).toContain("g-spark--ok");
    expect(spark([3, 2, 1])).toContain("g-spark--bad");
    expect(spark([3, 2, 1], { good: "down" })).toContain("g-spark--ok");
    expect(spark([2, 2])).toContain("g-spark--flat");
  });

  it("keeps every mark of a sparkline and a dial inside its box", () => {
    const pts = [...spark([0, 50, 100, 3], { w: 132, h: 38 }).matchAll(/([\d.]+),([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(132); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(38); }
    expect(dial({ value: 250, max: 100, display: "250%", label: "x" })).toMatch(/stroke-dasharray="194\.8 194\.8"/);
  });
});

describe("putting a run into the page", () => {
  const out = intoPage(PAGE, data());

  it("shows the new run and hides the rest", () => {
    expect(out).toMatch(/<div class="runview g-run" id="run-09">/);
    expect(out).toMatch(/<div class="runview" id="run-08" hidden>/);
    expect(out.indexOf('id="run-09"')).toBeLessThan(out.indexOf('id="run-08"'));
  });

  it("moves the rail's mark to the new run", () => {
    expect(out.match(/class="run active"/g)).toHaveLength(1);
    expect(out).toMatch(/class="run active" data-run="run-09"/);
    expect(out).toMatch(/<nav class="rail-jump" data-jump="run-08" hidden>/);
    expect(out).toMatch(/<nav class="rail-jump" data-jump="run-09">/);
    expect(renderRail(data()).li).toContain("2026-09-28");
  });

  it("can be run twice without doubling anything", () => {
    const twice = intoPage(out, data());
    expect(twice).toBe(out);
    expect(twice.match(/id="glance-css"/g)).toHaveLength(1);
    expect(twice.match(/id="glance-js"/g)).toHaveLength(1);
    expect(twice.match(/id="run-09"/g)).toHaveLength(1);
  });

  it("replaces a run that was first built by hand", () => {
    const byHand = PAGE.replace('<div class="inner">', `<div class="inner">
      <!-- ================================================================ -->
      <!-- ================== RUN 09 · 2026-09-28 ========================= -->
      <!-- ================================================================ -->
      <div class="runview" id="run-09">
      eight findings and five lettered actions
      </div><!-- /run-09 -->
`);
    const o = intoPage(byHand, data());
    expect(o).not.toContain("eight findings");
    expect(o.match(/id="run-09"/g)).toHaveLength(1);
  });

  it("never writes the key into the page", () => {
    expect(out).not.toMatch(/token["']?\s*[:=]\s*["'][A-Za-z0-9_-]{12,}/);
    expect(out).toContain('localStorage.getItem("ear_k")');
  });
});
