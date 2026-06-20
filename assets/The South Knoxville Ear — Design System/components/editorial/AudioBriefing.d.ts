import * as React from "react";

export interface AudioBriefingProps {
  /** @default "Weekend Audio Briefing" */
  title?: string;
  /** Bold serif intro line. @default "What's happening in SoKno. The 90-second roundup." */
  intro?: string;
  /** @default a short SoKno roundup line */
  description?: string;
  /** Total runtime readout. @default "01:30" */
  duration?: string;
  /** Rust cue label. @default "Listen now" */
  listenLabel?: string;
  style?: React.CSSProperties;
}

/**
 * The recurring neighborhood radio dispatch — round play button, hand-set waveform, time readout. Paper-styled, not a podcast embed.
 * @startingPoint section="Editorial" subtitle="Vintage audio briefing player with waveform" viewport="440x260"
 */
export function AudioBriefing(props: AudioBriefingProps): JSX.Element;
