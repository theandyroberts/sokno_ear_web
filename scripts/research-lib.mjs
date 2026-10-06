// The research pass's guard rails, as pure functions so they can be tested.
//
// Why this exists: No. 16 was researched from venue websites alone and ran nine Ijams
// Park stories on the weekend a music venue opened on Sevier Avenue, First Friday filled
// Old Sevier, and a play closed at the Borderland Playhouse. None of it was on a website;
// all of it was on the Old Sevier District's Instagram (Andy, 2026-10-02). A routine that
// says "check Old Sevier" is not enough. This makes skipping a source a failed check.

/** Stories in an episode, feature first. */
export function allStories(episode) {
  return [episode.feature, ...(episode.stories ?? [])].filter(Boolean);
}

/** Story count per location pill. */
export function districtTable(episode) {
  const table = {};
  for (const s of allStories(episode)) table[s.label] = (table[s.label] ?? 0) + 1;
  return table;
}

/**
 * @param {{ _rules: any, sources: any[] }} registry  content/sources.json
 * @param {{ checked?: Record<string, any>, leads?: any[], quiet?: Record<string, string> } | null} log
 *        content/research/<slug>.json
 * @param {any} episode  the draft
 * @returns {{ errors: string[], warnings: string[], table: Record<string, number> }}
 */
export function checkResearch(registry, log, episode) {
  const errors = [];
  const warnings = [];
  const rules = registry._rules ?? {};
  const table = districtTable(episode);
  const ids = new Set(allStories(episode).map((s) => s.id));

  if (!log) {
    errors.push("no research log for this episode: content/research/<slug>.json");
    return { errors, warnings, table };
  }
  const checked = log.checked ?? {};

  // 1. Every weekly source was looked at.
  for (const src of registry.sources) {
    if (src.weekly === false) continue;
    const c = checked[src.key];
    if (!c) {
      errors.push(`not checked: ${src.name} (${src.key})`);
    } else if (c.unreadable) {
      const line = `could not read ${src.name}: ${c.unreadable}`;
      if (src.hub) errors.push(`${line} — the hub has to be read; find another way in`);
      else warnings.push(line);
    } else if (src.instagram && !src.gated && c.how === "web") {
      errors.push(`${src.name}: only the website was read; its events are on @${src.instagram}`);
    }
  }

  // 2. Every lead ended up somewhere.
  for (const lead of log.leads ?? []) {
    if (lead.story) {
      if (!ids.has(lead.story)) errors.push(`lead "${lead.what}" points at story "${lead.story}", which is not in the episode`);
    } else if (!lead.skipped) {
      errors.push(`lead "${lead.what}" is neither a story nor skipped with a reason`);
    }
  }
  const hub = registry.sources.find((s) => s.hub);
  if (hub && checked[hub.key] && !checked[hub.key].unreadable && !(log.leads ?? []).some((l) => l.source === hub.key)) {
    warnings.push(`no leads logged from ${hub.name}; it posts every week`);
  }

  // 3. The week is spread across the beat.
  const total = allStories(episode).length;
  const ijams = table["Ijams Nature Center"] ?? 0;
  const oldSevier = table["Old Sevier"] ?? 0;
  if (rules.ijamsMaxStories != null && ijams > rules.ijamsMaxStories) {
    errors.push(`${ijams} Ijams Nature Center stories; the most in one episode is ${rules.ijamsMaxStories}. Keep the park's biggest things and drop the weekly classes`);
  } else if (rules.ijamsMaxShare != null && total >= 6 && ijams / total > rules.ijamsMaxShare) {
    errors.push(`Ijams Nature Center is ${ijams} of ${total} stories; it may be a third at most`);
  }
  if (rules.oldSevierMinStories != null && oldSevier < rules.oldSevierMinStories) {
    const why = log.quiet?.["Old Sevier"];
    if (why) warnings.push(`Old Sevier has ${oldSevier} stories (logged as a quiet week: ${why})`);
    else errors.push(`Old Sevier has ${oldSevier} stories; it needs at least ${rules.oldSevierMinStories}, or a reason under "quiet" in the log`);
  }

  return { errors, warnings, table };
}
