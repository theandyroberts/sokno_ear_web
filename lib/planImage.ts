// Draws the shareable game-plan card (1080×1350, the size Instagram and Messages show
// whole) on a canvas in the party page's own look: acid green, brush-black Anton,
// venue logos on cream chips. Browser-only.
import { CAT_LABEL, type PlanCat, type PlanOption } from "@/lib/planner";

const GREEN = "#CDE24A";
const INK = "#131309";
const CREAM = "#FDFAEB";
const W = 1080;
const H = 1350;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Wrap text to at most `maxLines` lines that fit `width`, ellipsizing the last. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= width || !line) line = test;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join(" ").length < text.length) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.replace(/[\s,.;:—-]+$/, "")}…`;
  }
  return lines;
}

/** The PNG to share, or null if the browser can't draw one. */
export async function renderPlanImage(opts: {
  dayName: string;
  dateLabel?: string;
  plan: { cat: PlanCat; option: PlanOption }[];
  /** Font-family strings as the page resolved them, so the card matches the page. */
  display: string;
  label: string;
}): Promise<File | null> {
  const { dayName, dateLabel, plan, display, label } = opts;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    await Promise.all([document.fonts.load(`80px ${display}`), document.fonts.load(`30px ${label}`)]);
  } catch {
    /* fall back to whatever is loaded */
  }
  const logos = await Promise.all(plan.map(({ option }) => (option.logo ? loadImage(option.logo) : Promise.resolve(null))));

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  // top band
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, 104);
  ctx.fillStyle = GREEN;
  ctx.font = `52px ${display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DIRTY SOUTH PARTY PLANNER", W / 2, 56);

  // headline
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.save();
  ctx.translate(70, 262);
  ctx.rotate(-0.018);
  ctx.font = `124px ${display}`;
  ctx.fillText(`MY ${dayName.toUpperCase()}`, 0, 0);
  ctx.restore();
  ctx.font = `30px ${label}`;
  ctx.fillText(`${(dateLabel ?? dayName).toUpperCase()} · SOUTH KNOXVILLE`, 74, 318);
  ctx.fillRect(70, 350, W - 140, 6);

  // the picks
  const top = 392;
  const slot = Math.min(270, Math.floor((H - 130 - top) / Math.max(plan.length, 1)));
  plan.forEach(({ cat, option }, i) => {
    const y = top + i * slot;
    // category chip
    ctx.font = `34px ${display}`;
    const chip = CAT_LABEL[cat].toUpperCase();
    const chipW = ctx.measureText(chip).width + 36;
    ctx.fillStyle = INK;
    ctx.fillRect(70, y, chipW, 52);
    ctx.fillStyle = GREEN;
    ctx.textBaseline = "middle";
    ctx.fillText(chip, 88, y + 28);
    ctx.textBaseline = "alphabetic";
    // time + title
    ctx.fillStyle = INK;
    const textW = W - 140 - 220;
    ctx.font = `50px ${display}`;
    const head = option.kind === "venue" ? option.title : `${option.time ? `${option.time} — ` : ""}${option.title}`;
    const lines = wrap(ctx, head.toUpperCase(), textW, 2);
    lines.forEach((l, j) => ctx.fillText(l, 70, y + 112 + j * 54));
    // venue line
    ctx.font = `28px ${label}`;
    const place = option.kind === "venue" ? option.address ?? "" : option.brand;
    ctx.fillText(wrap(ctx, place.toUpperCase(), textW, 1)[0] ?? "", 72, y + 112 + lines.length * 54 + 4);
    // logo chip
    const box = 190;
    const bx = W - 70 - box;
    const by = y + 6;
    ctx.save();
    ctx.translate(bx + box / 2, by + box / 2);
    ctx.rotate(i % 2 ? 0.02 : -0.02);
    ctx.fillStyle = CREAM;
    ctx.fillRect(-box / 2, -box / 2, box, box);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.strokeRect(-box / 2, -box / 2, box, box);
    const img = logos[i];
    if (img && img.naturalWidth) {
      const pad = 18;
      const s = Math.min((box - 2 * pad) / img.naturalWidth, (box - 2 * pad) / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `34px ${display}`;
      wrap(ctx, option.brand.toUpperCase(), box - 24, 3).forEach((l, j, all) =>
        ctx.fillText(l, 0, (j - (all.length - 1) / 2) * 36));
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  });

  // footer band
  ctx.fillStyle = INK;
  ctx.fillRect(0, H - 110, W, 110);
  ctx.fillStyle = GREEN;
  ctx.font = `44px ${display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PLAN YOURS ★ SOKNOEAR.COM/DIRTYSOUTHPARTY", W / 2, H - 54);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new File([blob], `dirty-south-${dayName.toLowerCase()}-game-plan.png`, { type: "image/png" });
}
