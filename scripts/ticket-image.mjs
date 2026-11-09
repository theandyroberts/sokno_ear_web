#!/usr/bin/env node
// Make a venue's ticket button from The 808's: the same worn ticket, the venue's name
// lettered down both sides (Andy, 2026-11-09: "always make a new ticket image with each
// venue's text on the sides, the rest looks the same").
//
//   node scripts/ticket-image.mjs <key> "<VENUE TEXT>" "<Venue name for the alt>"
//   → public/assets/spots/<key>-tickets.svg and <key>-tickets-dirty-south.svg
//
// Long names shrink to fit the side strip (about 310 units tall) instead of being cut.
import fs from "node:fs";

const [key, label, name] = process.argv.slice(2);
if (!key || !label || !name) { console.error('usage: node scripts/ticket-image.mjs <key> "<SIDE TEXT>" "<Venue name>"'); process.exit(1); }
const src = fs.readFileSync("public/assets/spots/the-808-tickets.svg", "utf8");
const chars = label.length;
// The 808's 7 characters sit at 43px with 6 units of letter-spacing. Keep that look
// for short names; scale the longer ones so they span no more than ~310 units.
const size = Math.min(43, Math.floor(310 / (chars * 0.66 + 0.14 * (chars - 1))));
const spacing = size >= 40 ? 6 : Math.max(2, Math.round(size * 0.14));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&#39;");
let out = src
  .replace("<title id=\"title\">Get tickets — The 808</title>", `<title id="title">Get tickets — ${esc(name)}</title>`)
  .replace("THE 808 lettered down both sides", `${esc(label)} lettered down both sides`)
  .replace(/<text id="venue-left"[^>]*>THE 808<\/text>/, `<text id="venue-left" transform="translate(119 220) rotate(-90)" font-size="${size}" letter-spacing="${spacing}">${esc(label)}</text>`)
  .replace(/<text id="venue-right"[^>]*>THE 808<\/text>/, `<text id="venue-right" transform="translate(681 220) rotate(90)" font-size="${size}" letter-spacing="${spacing}">${esc(label)}</text>`);
if (!out.includes(`>${esc(label)}</text>`)) { console.error("the venue label did not take"); process.exit(1); }
for (const suffix of ["", "-dirty-south"]) {
  const path = `public/assets/spots/${key}-tickets${suffix}.svg`;
  fs.writeFileSync(path, out);
  console.log(`wrote ${path} (side text ${size}px, spacing ${spacing})`);
}
