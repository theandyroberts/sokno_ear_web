// Standing-item cap for the Instagram drip.
//
// Some stories are true every week — Earl's specials board, Hi-Wire's Thursday pint
// night, the Playscape story time. They are worth carrying in the episode, but running
// the same banner with the same caption week after week decays it: the specials board
// read 18, then 12, then 6 across three identical runs, and the two worst posts of
// No. 12 were both verbatim repeats of No. 11.
//
// A story is a "repeat" if its KEY has already run in an earlier episode, or if the
// story declares `social.standing: true` (standing from its first run). At most one
// repeat rides the drip per week, and it rotates — the one that has gone longest
// without running gets the slot. Everything new is untouched.
//
// The key is `social.standingKey ?? id`. Keying on the bare id was a hole: renaming
// `playscape-storytelling` → `playscape-fall` reset the counter to zero and the banner
// ran a third straight Friday. See docs/ig-reviews/2026-09-15.md, finding 8 / A10.

/** Repeats allowed in a single episode's drip. */
export const MAX_REPEATS_PER_EPISODE = 1;

/** The identity the cap counts by. Survives a retitle; falls back to the story id. */
export function standingKeyOf(story) {
  return story?.social?.standingKey || story?.id;
}

/**
 * Fold the episode archive into "how often has this key run, and when last" —
 * counting only episodes that came before the one being built.
 *
 * @param {Array<{date: string, keys?: string[], ids?: string[]}>} episodes
 *   `keys` are standing keys. `ids` is the pre-A10 spelling, still read so an older
 *   caller (or an archive fixture) keeps working.
 * @param {string} currentDate  the episode being staged; it and anything later is ignored
 * @returns {Map<string, {runs: number, lastRun: string}>}
 */
export function priorRunsById(episodes, currentDate) {
  const history = new Map();
  for (const ep of [...episodes].sort((a, b) => a.date.localeCompare(b.date))) {
    if (ep.date >= currentDate) continue;
    for (const key of ep.keys ?? ep.ids ?? []) {
      const prev = history.get(key);
      history.set(key, { runs: (prev?.runs ?? 0) + 1, lastRun: ep.date });
    }
  }
  return history;
}

/**
 * Which of this week's keys are repeats too many. Returns the keys to drop from the
 * drip — the episode itself still carries them, only the Instagram queue thins out.
 *
 * Rotation order: longest since its last run first, then least-run, then key, so the
 * keeper is the freshest of the standing items and a heavy repeater waits its turn.
 * A declared-standing item with no history yet sorts FIRST (nothing has decayed yet),
 * so it keeps its slot over one that has already run — but it still counts against
 * the cap, which is the point: declaring it standing is what makes it compete at all.
 *
 * @param {string[]} storyKeys  the keys staged for this episode, in queue order
 * @param {Map<string, {runs: number, lastRun: string}>} history  from priorRunsById
 * @param {{max?: number, standingKeys?: Iterable<string>}} [opts]
 *   `standingKeys` are keys declared `social.standing: true` — repeats from run one.
 * @returns {string[]} keys to drop
 */
export function pickRepeatsToDrop(storyKeys, history, opts = {}) {
  const max = opts.max ?? MAX_REPEATS_PER_EPISODE;
  const declared = new Set(opts.standingKeys ?? []);
  const repeats = storyKeys.filter((k) => history.has(k) || declared.has(k));
  if (repeats.length <= max) return [];

  // No history = never run = nothing has decayed yet, so it has gone the longest
  // without running and sorts FIRST — the keeper, ahead of anything already spent.
  const seen = (k) => history.get(k) ?? { runs: 0, lastRun: "" };
  const ranked = [...repeats].sort((a, b) => {
    const x = seen(a);
    const y = seen(b);
    return x.lastRun.localeCompare(y.lastRun) || x.runs - y.runs || a.localeCompare(b);
  });
  return ranked.slice(max).sort((a, b) => storyKeys.indexOf(a) - storyKeys.indexOf(b));
}
