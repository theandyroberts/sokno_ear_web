#!/usr/bin/env node
// Holds a week's art to the locked style in content/art-style.json: the prompts use the
// wrapper word for word and name a background, and the finished pictures carry no lit teal
// or blue and no empty paper around the subject. Run it before a draft ships; a failure
// means redo the picture, not the rule. It can't judge a face or a line; look at them too.
//
//   node scripts/art-check.mjs 2026-11-04
//   node scripts/art-check.mjs --images public/assets/spots/a.jpg public/assets/spots/b.jpg
import { readFileSync } from "node:fs";
import sharp from "sharp";

const style = JSON.parse(readFileSync("content/art-style.json", "utf8"));
const MAX_OFF_PALETTE = 0.03; // share of pixels that read as teal, blue, purple or bright green
const MAX_PAPER_EDGE = 0.45; // share of the outer ring that is bare paper

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const s = max ? d / max : 0;
  const v = max / 255;
  if (!d) return [0, s, v];
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, v];
}

async function audit(path) {
  const size = 100;
  const { data } = await sharp(path).removeAlpha().resize(size, size, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let off = 0, paper = 0, ring = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      const [h, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
      // Pine is dark, so it passes; the same hue lit up is the teal this check is here to catch.
      const light = h >= 150 && h <= 300 && s > 0.15 && v > 0.45;
      const green = h >= 75 && h < 150 && s > 0.3 && v > 0.45;
      if (light || green) off++;
      if (x < 6 || y < 6 || x >= size - 6 || y >= size - 6) {
        ring++;
        if (v > 0.8 && s < 0.3) paper++;
      }
    }
  }
  return { off: off / (size * size), paper: paper / ring };
}

function checkPrompts(slug) {
  const art = JSON.parse(readFileSync(`content/research/${slug}.art.json`, "utf8"));
  const problems = [];
  if (art.suffix !== style.suffix) problems.push("suffix differs from content/art-style.json");
  for (const [key, { prompt, note }] of Object.entries(art.images)) {
    const plate = /background plate/.test(note ?? "");
    if (!prompt.startsWith(style.intro)) problems.push(`${key}: prompt doesn't open "${style.intro.trim()}"`);
    if (!/Behind it, /.test(prompt) && !plate) problems.push(`${key}: prompt names no background`);
    for (const word of style.bannedInPrompts) {
      if (new RegExp(`\\b${word}\\b`, "i").test(prompt)) problems.push(`${key}: prompt says "${word}"`);
    }
  }
  return { problems, files: Object.values(art.images).map((i) => i.file) };
}

const args = process.argv.slice(2);
let problems = [];
let paths;
if (args[0] === "--images") {
  paths = args.slice(1);
} else {
  const slug = args[0];
  const number = JSON.parse(readFileSync(`content/drafts/${slug}.json`, "utf8")).number;
  const result = checkPrompts(slug);
  problems = result.problems;
  paths = result.files.map((f) => `public/assets/spots/no${number}_${f}`);
}
for (const path of paths) {
  const { off, paper } = await audit(path);
  const line = `${path.split("/").pop()}: off-palette ${(off * 100).toFixed(1)}%, paper on edge ${(paper * 100).toFixed(0)}%`;
  console.log(line);
  if (off > MAX_OFF_PALETTE) problems.push(`${path}: ${(off * 100).toFixed(1)}% off-palette color`);
  if (paper > MAX_PAPER_EDGE) problems.push(`${path}: ${(paper * 100).toFixed(0)}% bare paper on the frame edge`);
}
if (problems.length) {
  console.error(`\nart-check FAILED\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nart-check ok");
