// The game-plan card, drawn on the server (Next's ImageResponse) from a plan link's
// picks — so a link pasted into Messages previews as the plan itself, and the share
// sheet sends the same picture (Andy, 2026-11-20). Two shapes from one design:
//   wide  1200×630  — what link previews show (iMessage, WhatsApp, Android all crop wide)
//   tall  1080×1350 — the picture the share sheet attaches
// Satori rules apply: flexbox only, and any element with more than one child needs
// display: flex.
import fs from "node:fs";
import path from "node:path";
import { CAT_LABEL, type PlanCat, type PlanOption } from "@/lib/planner";

const GREEN = "#CDE24A";
const INK = "#131309";
const CREAM = "#FDFAEB";

export type CardSize = "wide" | "tall";
export const CARD_DIMS: Record<CardSize, { width: number; height: number }> = {
  wide: { width: 1200, height: 630 },
  tall: { width: 1080, height: 1350 },
};

const fontFile = (name: string) => fs.readFileSync(path.join(process.cwd(), "public", "fonts", name));

/** Fonts for ImageResponse: the page's Anton for display, Special Elite for labels. */
export function cardFonts() {
  return [
    { name: "Anton", data: fontFile("Anton-Regular.ttf"), weight: 400 as const, style: "normal" as const },
    { name: "Special Elite", data: fontFile("SpecialElite-Regular.ttf"), weight: 400 as const, style: "normal" as const },
  ];
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", webp: "image/webp" };

/** A logo from public/ as a data URI, or null if it can't be read. */
export function logoData(logo?: string | null): string | null {
  if (!logo || !logo.startsWith("/")) return null;
  const file = path.join(process.cwd(), "public", logo);
  if (!file.startsWith(path.join(process.cwd(), "public"))) return null;
  try {
    const ext = logo.split(".").pop()!.toLowerCase();
    if (!MIME[ext]) return null;
    return `data:${MIME[ext]};base64,${fs.readFileSync(file).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Cut to `max` characters at a word boundary, with an ellipsis — Satori can't clamp lines. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).replace(/[\s,.;:—-]+$/, "")}…`;
}

/** Shrink the headline so "DIRTY SOUTH SATURDAY" fits as well as "DIRTY SOUTH FRIDAY".
 *  Anton runs about 0.46 of its size per capital. */
function fitSize(text: string, width: number, max: number): number {
  return Math.min(max, Math.floor(width / (text.length * 0.46)));
}

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill={color} d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z" />
    </svg>
  );
}

export type CardPick = { cat: PlanCat; option: PlanOption; logo: string | null };

export function PlanCard({ size, dayName, dateLabel, plan }: {
  size: CardSize;
  dayName: string;
  dateLabel?: string;
  plan: CardPick[];
}) {
  const { width, height } = CARD_DIMS[size];
  const wide = size === "wide";
  const pad = wide ? 56 : 70;
  const headline = `DIRTY SOUTH ${dayName.toUpperCase()}`;
  const headSize = fitSize(headline, width - pad * 2, wide ? 84 : 124);
  const box = wide ? 104 : 190;
  const titleSize = wide ? 38 : 50;
  const titleMax = wide ? 58 : 66;
  const band = wide ? 64 : 104;
  const foot = wide ? 58 : 110;
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: GREEN, color: INK, fontFamily: "Anton" }}>
      <div style={{ height: band, background: INK, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: wide ? 38 : 52 }}>
        PARTY IN THE DIRTY SOUTH
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${wide ? 16 : 40}px ${pad}px 0` }}>
        <div style={{ display: "flex", fontSize: headSize, lineHeight: 1, transform: "rotate(-1deg)" }}>{headline}</div>
        <div style={{ display: "flex", fontFamily: "Special Elite", fontSize: wide ? 22 : 30, marginTop: wide ? 12 : 14 }}>
          {`${(dateLabel ?? dayName).toUpperCase()} · SOUTH KNOXVILLE`}
        </div>
        <div style={{ display: "flex", height: wide ? 5 : 6, background: INK, margin: wide ? "10px 0 6px" : "22px 0 24px" }} />
        {plan.map(({ cat, option, logo }, i) => {
          const head = option.kind === "venue" ? option.title : `${option.time ? `${option.time} — ` : ""}${option.title}`;
          const place = option.kind === "venue" ? option.address ?? "" : option.brand;
          return (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: wide ? 22 : 30, height: wide ? 120 : 270 }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex" }}>
                  <div style={{ display: "flex", background: INK, color: GREEN, fontSize: wide ? 24 : 34, padding: wide ? "1px 12px" : "3px 18px" }}>
                    {CAT_LABEL[cat].toUpperCase()}
                  </div>
                </div>
                <div style={{ display: "flex", fontSize: titleSize, lineHeight: 1.05, marginTop: wide ? 6 : 14 }}>
                  {clip(head.toUpperCase(), titleMax)}
                </div>
                {place ? (
                  <div style={{ display: "flex", fontFamily: "Special Elite", fontSize: wide ? 20 : 28, marginTop: wide ? 4 : 10 }}>
                    {clip(place.toUpperCase(), 48)}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  width: box, height: box, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: CREAM, border: `${wide ? 4 : 5}px solid ${INK}`, transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)`,
                  padding: wide ? 10 : 18,
                }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" width={box - (wide ? 28 : 46)} height={box - (wide ? 28 : 46)} style={{ objectFit: "contain" }} />
                ) : (
                  <div style={{ display: "flex", textAlign: "center", fontSize: wide ? 22 : 34, lineHeight: 1 }}>
                    {clip(option.brand.toUpperCase(), 28)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: foot, background: INK, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: wide ? 30 : 44 }}>
        <span>PLAN YOURS</span>
        <Star size={wide ? 26 : 38} color={GREEN} />
        <span>SOKNOEAR.COM/DIRTYSOUTHPARTY</span>
      </div>
    </div>
  );
}
