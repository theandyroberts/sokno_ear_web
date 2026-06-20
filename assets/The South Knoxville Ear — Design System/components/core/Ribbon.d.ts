import * as React from "react";

export interface RibbonProps {
  children: React.ReactNode;
  /** @default "teal" */
  color?: "teal" | "rust" | "green";
  style?: React.CSSProperties;
}

/**
 * Teal handbill banner with notched ends and flanking stars — the tagline strip under the masthead.
 */
export function Ribbon(props: RibbonProps): JSX.Element;
