#!/usr/bin/env node
// Fetch every website in content/sources.json in one go, and list the Instagram
// accounts that still have to be read in the built-in browser.
//
//   node scripts/research-sweep.mjs <slug>
//
// Writes one text file per page to data/research/<slug>/ (gitignored) and prints a
// line per source. It does not decide anything: read the files, then record what you
// found in content/research/<slug>.json. Instagram cannot be read from here; see
// scripts/ig-scan.browser.js.
import fs from "node:fs";
import path from "node:path";

const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/research-sweep.mjs <slug>"); process.exit(1); }
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const registry = JSON.parse(fs.readFileSync("content/sources.json", "utf8"));
const out = path.join("data", "research", slug);
fs.mkdirSync(out, { recursive: true });

const strip = (html) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctl.signal, redirect: "follow" });
    return { status: r.status, body: await r.text() };
  } catch (e) {
    return { status: 0, body: "", err: String(e.cause?.code ?? e.message ?? e) };
  } finally { clearTimeout(t); }
}

console.log(`research sweep · ${slug} · ${registry.sources.length} sources\n`);
for (const src of registry.sources) {
  const urls = [...(src.web ?? []), ...(src.ics ? [src.ics] : [])];
  for (const [i, url] of urls.entries()) {
    const { status, body, err } = await get(url);
    const text = url.endsWith(".ics") ? body : strip(body);
    const file = path.join(out, `${src.key}${urls.length > 1 ? `-${i + 1}` : ""}.txt`);
    fs.writeFileSync(file, `${url}\nHTTP ${status}${err ? ` ${err}` : ""}\n\n${text}\n`);
    console.log(`${status === 200 ? "✓" : "✗"} ${src.key.padEnd(24)} ${String(status).padEnd(4)} ${String(text.length).padStart(7)} chars  ${file}`);
  }
}
const ig = registry.sources.filter((s) => s.instagram);
console.log(`\nInstagram, in the built-in browser (scripts/ig-scan.browser.js), ${ig.length} accounts:`);
for (const s of ig) console.log(`  ${s.hub ? "★" : " "} https://www.instagram.com/${s.instagram}/${s.gated ? "   (age-gated: expect seen: 0 when logged out)" : ""}`);
console.log(`\nThen: content/research/${slug}.json, and node scripts/research-check.mjs ${slug}`);
