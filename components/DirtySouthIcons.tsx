import * as React from "react";

// Chunky one-color glyphs for the Dirty South checklist — deliberately crude,
// cut like rubber stamps so they sit next to Anton and feel screen-printed.
// One set, six categories; the same SVGs can anchor listings on print flyers.

export type NightCat = "food" | "drink" | "music" | "dance" | "mic" | "star";

const P: Record<NightCat, React.ReactNode> = {
  // fork + knife, thick tines
  food: (
    <>
      <path d="M5 2h2.6v7.2c0 1.4-.9 2.4-2 2.8V22H3.4V12c-1.1-.4-2-1.4-2-2.8V2H4v7h1V2Z" />
      <path d="M14 2c3 0 5 2.6 5 6.2 0 2.7-1.2 4.6-3 5.3V22h-2.6V2H14Z" />
    </>
  ),
  // pint mug with handle
  drink: (
    <>
      <path d="M4 3h12v19H4V3Zm2.6 3v13h2.2V6H6.6Zm4.4 0v13h2.2V6H11Z" />
      <path d="M16 7h3.4c1 0 1.6.7 1.6 1.6v6c0 1-.7 1.6-1.6 1.6H16v-2.6h2.4V9.6H16V7Z" />
    </>
  ),
  // beamed eighth notes
  music: (
    <>
      <path d="M8 4l13-2v3.4L11 7v9.4A3.5 3.5 0 1 1 8 13V4Z" />
      <path d="M18 8.6V15a3.3 3.3 0 1 1-3-1V9l3-.4Z" />
    </>
  ),
  // cowboy boot
  dance: (
    <>
      <path d="M7 2h8v3H7V2Zm0 4h8v6c0 1.5.8 2.3 2.2 3l3.2 1.6c1 .5 1.6 1.2 1.6 2.4v3H2v-3h3.4c1 0 1.6-.7 1.6-1.7V6Z" />
    </>
  ),
  // retro microphone
  mic: (
    <>
      <path d="M12 1a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V6a5 5 0 0 1 5-5Z" />
      <path d="M4.6 10.6h2.6a4.8 4.8 0 0 0 9.6 0h2.6a7.4 7.4 0 0 1-6.1 7.2V21H17v2.4H7V21h3.7v-3.2a7.4 7.4 0 0 1-6.1-7.2Z" />
    </>
  ),
  // brush star
  star: (
    <path d="M12 1l3 7.4 8 .6-6.1 5.1L19 22l-7-4.3L5 22l2.1-7.9L1 9l8-.6L12 1Z" />
  ),
};

export function NightIcon({ cat, size = 30, rotate = 0 }: { cat: NightCat; size?: number; rotate?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ fill: "currentColor", flexShrink: 0, transform: `rotate(${rotate}deg)` }}
    >
      {P[cat] ?? P.star}
    </svg>
  );
}
