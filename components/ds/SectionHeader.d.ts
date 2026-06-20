import * as React from "react";

export interface SectionHeaderProps {
  children: React.ReactNode;
  /** @default "center" */
  align?: "center" | "left";
  /** Flanking ornament. @default "diamond" */
  ornament?: "diamond" | "star" | "flourish";
  /** Anchor id — handy for in-page jump links on the one-page scroll. */
  id?: string;
  style?: React.CSSProperties;
}

/**
 * Printed section rubric flanked by ornamental rules — opens each section of the weekly page.
 * @startingPoint section="Editorial" subtitle="Printed section rubric with ornamental rules" viewport="700x120"
 */
export function SectionHeader(props: SectionHeaderProps): React.JSX.Element;
