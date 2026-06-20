import * as React from "react";

export interface ButtonProps {
  children: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "rust" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Append a → arrow (newspaper "read more" affordance). @default false */
  arrow?: boolean;
  /** Render as an anchor instead of a button. */
  href?: string;
  /** @default false */
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Stamped, lightly distressed print button with a hard letterpress offset shadow.
 * @startingPoint section="Core" subtitle="Stamped print buttons — primary, secondary, rust, ghost" viewport="700x160"
 */
export function Button(props: ButtonProps): JSX.Element;
