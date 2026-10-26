import * as React from "react";

export interface CalendarItemProps {
  /** Short month, e.g. "MAY". Accepted for older callers; the date is drawn in the day bar, not on the row. */
  month?: string;
  /** Day number, e.g. "17". Accepted for older callers; not drawn on the row. */
  day?: string | number;
  title: React.ReactNode;
  /** Time / place line. */
  meta?: React.ReactNode;
  /** Show a ★ on the cue line under the meta. @default false */
  starred?: boolean;
  /** Hairline divider under the row. @default true */
  divider?: boolean;
  /** Make the whole row a link (usually "#story-id" to jump to coverage). Adds a → to the cue line. */
  href?: string;
  /** Public path to the venue's logo (from content/venues.json). Null/undefined draws the wordmark tile instead. */
  logo?: string | null;
  /** The registry's `treatment` for the logo ("as-is", "ink-recolor", "cropped"); carried on the tile as data-treatment. */
  logoTreatment?: string | null;
  /** The venue's name — set as the wordmark on the tile when there is no logo. */
  venueName?: string;
  style?: React.CSSProperties;
}

/**
 * One row of the "What's Happening Soon" calendar — venue tile, title, meta, and a cue line (★, →).
 */
export function CalendarItem(props: CalendarItemProps): React.JSX.Element;
