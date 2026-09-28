import type { Episode, Story } from "./schema";

/**
 * How many stories to lift into the feature band so the main column runs as long as
 * the sidebar beside it.
 *
 * The sidebar's height is set by the calendar and the main column's by the feature, and
 * neither knows about the other. Counting calendar rows alone (the rule until No. 16)
 * left a third of the column empty under a 14-row calendar, because rows wrap and
 * features vary (Andy, 2026-09-28). So both sides are estimated from their content.
 *
 * Every number here was measured on the live site at 1360px, where the main column is
 * 666px wide: eight stories from No. 16 and two from No. 15. The story fit lands within
 * 25px of each one. The columns hold these widths from 1148px up; below 820px the page
 * is a single column and none of this shows.
 */

const STORY_BASE = 289;        // headline, deck, facts frame, sources, share row
const STORY_PER_CHAR = 0.458;  // body and facts text, at the column's measure
const IMAGE_TOP_EXTRA = 265;   // a banner image sits above the text instead of beside it
const LIFTED_WRAP = 123;       // divider, section header and padding around a lifted story

const SIDEBAR_AD = 139;        // the Dirty South card and the gap under it
const SIDEBAR_PLAYER = 431;    // the audio player and the gap under it
const CALENDAR_FRAME = 87;     // the well's title bar, padding and "don't miss it" line
const CALENDAR_ROW = 118;      // one row, averaged over rows that wrap and rows that don't
const CALENDAR_DAYBAR = 43;    // the dark weekday bar that heads each date

/** A blank stretch shorter than this is left alone; longer, and another story is lifted. */
const TOLERATED_GAP = 300;

function storyChars(s: Story): number {
  let n = s.title.length + (s.deck?.length ?? 0) + (s.imageCaption?.length ?? 0);
  for (const f of s.facts) n += f.label.length + f.value.length;
  for (const b of s.body) {
    if (b.type === "agenda") {
      for (const r of b.rows) n += r.time.length + r.what.length;
    } else if (b.type === "subhead") {
      n += b.text.length;
    } else {
      n += b.text?.length ?? (b.runs ?? []).reduce((sum, r) => sum + r.text.length, 0);
    }
  }
  for (const src of s.sources ?? []) n += src.label.length;
  return n;
}

/** Rendered height of a story in the feature column, in px. */
export function estimateStoryHeight(s: Story): number {
  const image = s.layout === "imageTop" || s.layout === "banner" ? IMAGE_TOP_EXTRA : 0;
  return Math.round(STORY_BASE + STORY_PER_CHAR * storyChars(s) + image);
}

/** Rendered height of the sidebar beside the feature, in px. */
export function estimateSidebarHeight(sidebar: Episode["sidebar"]): number {
  const rows = sidebar.calendar;
  const dates = rows.filter((c, i) => i === 0 || c.month !== rows[i - 1].month || c.day !== rows[i - 1].day).length;
  const calendar = rows.length ? CALENDAR_FRAME + rows.length * CALENDAR_ROW + dates * CALENDAR_DAYBAR : 0;
  return SIDEBAR_AD + (sidebar.audio ? SIDEBAR_PLAYER : 0) + calendar;
}

export function liftCount(episode: Pick<Episode, "feature" | "stories" | "sidebar">): number {
  const side = estimateSidebarHeight(episode.sidebar);
  let main = estimateStoryHeight(episode.feature);
  let n = 0;
  while (n < episode.stories.length && side - main > TOLERATED_GAP) {
    main += estimateStoryHeight(episode.stories[n]) + LIFTED_WRAP;
    n += 1;
  }
  return n;
}
