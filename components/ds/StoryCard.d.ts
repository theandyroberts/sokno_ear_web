import * as React from "react";

export interface StoryCardProps {
  /** Section rubric shown as a small Tag (e.g. "Rumor Mill"). */
  label?: string;
  /** @default "rust" */
  labelColor?: "rust" | "teal" | "green" | "ink" | "gold";
  /** Day chips shown beside the location pill (e.g. ["Thu","Fri"]). */
  days?: string[];
  /** Show a "HOT" star flag over the image. @default false */
  hot?: boolean;
  /** Engraving / spot-illustration thumbnail URL. */
  image?: string;
  title: React.ReactNode;
  /** Short scannable blurb. */
  blurb?: React.ReactNode;
  /** Optional jump cue ("Jump to story", "Listen now"). */
  cue?: string;
  /** Where the cue points — on the one-page paper, use a "#anchor". */
  href?: string;
  style?: React.CSSProperties;
}

/**
 * Bordered paper card with engraving thumbnail, headline, and blurb — the "Top Stories" scanner grid.
 * @startingPoint section="Editorial" subtitle="Engraving-thumb story card for the scanner grid" viewport="320x360"
 */
export function StoryCard(props: StoryCardProps): React.JSX.Element;
