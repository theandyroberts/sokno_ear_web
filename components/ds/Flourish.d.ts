import * as React from "react";

export interface FlourishProps {
  /** The ink of the hairlines and the ornament. @default "var(--ink-black)" */
  color?: string;
  /** Width of the centre ornament in px; the hairlines fill the rest. @default 180 */
  width?: number;
  style?: React.CSSProperties;
}

/**
 * Old-timey filigree rule: hairlines either side of a centred engraved ornament, inline SVG in the site's ink.
 */
export function Flourish(props: FlourishProps): React.JSX.Element;
