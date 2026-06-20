import * as React from "react";

export interface TiplineProps {
  /** "subscribe" = email signup; "tip" = rumor/tip prompt. @default "subscribe" */
  mode?: "subscribe" | "tip";
  /** Override the rubric heading. */
  title?: string;
  /** Override the body copy. */
  blurb?: string;
  /** Override the input placeholder. */
  placeholder?: string;
  /** Override the button label. */
  cta?: string;
  onSubmit?: (e: React.FormEvent) => void;
  style?: React.CSSProperties;
}

/**
 * "Get the Ear Delivered" newsletter signup or "Have a Tip? We're All Ears" prompt — bordered paper module.
 */
export function Tipline(props: TiplineProps): JSX.Element;
