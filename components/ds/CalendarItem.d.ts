import * as React from "react";

export interface CalendarItemProps {
  /** Short month, e.g. "MAY". */
  month: string;
  /** Day number, e.g. "17". */
  day: string | number;
  title: React.ReactNode;
  /** Time / place line. */
  meta?: React.ReactNode;
  /** Show a trailing ★. @default false */
  starred?: boolean;
  /** Hairline divider under the row. @default true */
  divider?: boolean;
  style?: React.CSSProperties;
}

/**
 * One row of the "What's Happening Soon" calendar — stamped date block, title, meta, optional star.
 */
export function CalendarItem(props: CalendarItemProps): React.JSX.Element;
