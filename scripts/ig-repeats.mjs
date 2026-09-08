// Standing-item cap for the Instagram drip.
//
// Some stories are true every week — Earl's specials board, Hi-Wire's Thursday pint
// night, the Playscape story time. They are worth carrying in the episode, but running
// the same banner with the same caption week after week decays it: the specials board
// read 18, then 12, then 6 across three identical runs, and the two worst posts of
// No. 12 were both verbatim repeats of No. 11.
//
// A story is a "repeat" if its id has already run in an earlier episode. At most one
// repeat rides the drip per week, and it rotates — the one that has gone longest
// without running gets the slot. Everything new is untouched.
//
// See docs/ig-reviews/2026-09-07.md, finding 2 / A7.

/** Repeats allowed in a single episode's drip. */
export const MAX_REPEATS_PER_EPISODE = 1;

/**
 * Fold the episode archive into "how often has this story run, and when last" —
 * counting only episodes that came before the one being built.
 *
 * @param {Array<{date: string, ids: string[]}>} episodes
 * @param {string} currentDate  the episode being staged; it and anything later is ignored
 * @returns {Map<string, {runs: number, lastRun: string}>}
 */
export function priorRunsById(episodes, currentDate) {
  const history = new Map();
  for (const ep of [...episodes].sort((a, b) => a.date.localeCompare(b.date))) {
    if (ep.date >= currentDate) continue;
    for (const id of ep.ids ?? []) {
      const prev = history.get(id);
      history.set(id, { runs: (prev?.runs ?? 0) + 1, lastRun: ep.date });
    }
  }
  return history;
}

/**
 * Which of this week's stories are repeats too many. Returns the ids to drop from
 * the drip — the episode itself still carries them, only the Instagram queue thins out.
 *
 * Rotation order: longest since its last run first, then least-run, then id, so the
 * keeper is the freshest of the standing items and a heavy repeater waits its turn.
 *
 * @param {string[]} storyIds  the ids staged for this episode, in queue order
 * @param {Map<string, {runs: number, lastRun: string}>} history  from priorRunsById
 * @param {{max?: number}} [opts]
 * @returns {string[]} ids to drop
 */
export function pickRepeatsToDrop(storyIds, history, opts = {}) {
  const max = opts.max ?? MAX_REPEATS_PER_EPISODE;
  const repeats = storyIds.filter((id) => history.has(id));
  if (repeats.length <= max) return [];

  const ranked = [...repeats].sort((a, b) => {
    const x = history.get(a);
    const y = history.get(b);
    return x.lastRun.localeCompare(y.lastRun) || x.runs - y.runs || a.localeCompare(b);
  });
  return ranked.slice(max).sort((a, b) => storyIds.indexOf(a) - storyIds.indexOf(b));
}
