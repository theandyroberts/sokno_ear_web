import * as React from "react";

export interface DividerProps {
  /** Center ornament. @default "star" */
  ornament?: "star" | "diamond" | "flourish" | "triple" | "double";
  /** @default "ink" */
  color?: "ink" | "rust" | "teal";
  /** Rule thickness in px. @default 2 */
  thickness?: number;
  style?: React.CSSProperties;
}

/**
 * Decorative newspaper rule with a center ornament — keeps the old-print rhythm between sections.
 */
export function Divider(props: DividerProps): JSX.Element;
