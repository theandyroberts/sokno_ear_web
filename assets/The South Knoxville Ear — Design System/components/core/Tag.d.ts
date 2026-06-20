import * as React from "react";

export interface TagProps {
  children: React.ReactNode;
  /** @default "rust" */
  color?: "rust" | "teal" | "green" | "ink" | "gold";
  /** @default "solid" */
  variant?: "solid" | "outline";
  /** @default "md" */
  size?: "sm" | "md";
  /** Prefix a ★ star (editorial flair). @default false */
  star?: boolean;
  style?: React.CSSProperties;
}

/**
 * Small stamped print label — section rubrics, "HOT" flags, category chips.
 */
export function Tag(props: TagProps): JSX.Element;
