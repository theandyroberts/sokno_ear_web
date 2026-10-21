import * as React from "react";

export interface ArticleFact {
  label: string;
  value: React.ReactNode;
}

export interface ArticleProps {
  /** Anchor id for in-page jump links. */
  id?: string;
  /** Section rubric ("OLD SEVIER", "RUMOR MILL"). */
  label?: string;
  /** @default "rust" */
  labelColor?: "rust" | "teal" | "green" | "ink" | "gold";
  /** Day chips shown beside the location pill (e.g. ["Thu","Fri"]). */
  days?: string[];
  /** Lead image / engraving URL, framed like a printed clipping. */
  image?: string;
  imageCaption?: string;
  /** Opens the image full screen on a click, with zoom and pan — for maps and diagrams. @default false */
  imageZoom?: boolean;
  /** Compact ticket link immediately below the headline/deck. */
  ticket?: { href: string; image: string; alt: string };
  title: React.ReactNode;
  /** One- or two-sentence deck explaining why the story matters. */
  deck?: React.ReactNode;
  /** Event facts strip — date, time, place, cost, source. */
  facts?: ArticleFact[];
  /** Full body — pass <p> paragraphs. */
  children: React.ReactNode;
  /** "wrap" floats the image into the text; "stack" puts it full-width above. @default "wrap" */
  layout?: "imageLeft" | "imageRight" | "imageTop" | "banner" | "textOnly";
  style?: React.CSSProperties;
}

/**
 * A full inline story for the one-page weekly paper — rubric, engraving, headline, deck, facts, and full body. No "read more".
 * @startingPoint section="Editorial" subtitle="Full inline newspaper story — no read-more" viewport="760x520"
 */
export function Article(props: ArticleProps): React.JSX.Element;
