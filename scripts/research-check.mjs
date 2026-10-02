#!/usr/bin/env node
// Did the research pass look everywhere, and is the episode spread across the beat?
//
//   node scripts/research-check.mjs <slug>
//
// Reads content/sources.json, content/research/<slug>.json and the draft (or the
// published episode). Exits 1 when a source was skipped, a lead was dropped without a
// reason, or the week leans on one place. Run it before the draft is deployed.
import fs from "node:fs";
import path from "node:path";
import { checkResearch } from "./research-lib.mjs";

const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/research-check.mjs <slug>"); process.exit(1); }
const read = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const root = process.cwd();
const episode = read(path.join(root, "content/drafts", `${slug}.json`)) ?? read(path.join(root, "content/episodes", `${slug}.json`));
if (!episode) { console.error(`no episode ${slug} in content/drafts or content/episodes`); process.exit(1); }
const registry = read(path.join(root, "content/sources.json"));
const log = read(path.join(root, "content/research", `${slug}.json`));

const { errors, warnings, table } = checkResearch(registry, log, episode);
console.log(`research check · ${slug} · No. ${episode.number}`);
console.log("stories by place: " + Object.entries(table).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
if (log) console.log(`sources checked: ${Object.keys(log.checked ?? {}).length} of ${registry.sources.filter((s) => s.weekly !== false).length} · leads: ${(log.leads ?? []).length}`);
for (const w of warnings) console.log(`  ! ${w}`);
for (const e of errors) console.log(`  ✗ ${e}`);
console.log(errors.length ? `\n✗ ${errors.length} problem(s). Fix them before the draft goes up.` : "\n✓ every source was read and the week is spread across the beat");
process.exit(errors.length ? 1 : 0);
