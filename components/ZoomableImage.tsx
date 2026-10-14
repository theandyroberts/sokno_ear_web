"use client";
import * as React from "react";
import { track } from "@/lib/track";

/**
 * A story image that opens full screen on a click or tap, with zoom and pan, for
 * pictures with detail worth getting close to: a parking map, a route, a diagram.
 * (Andy, 2026-10-14: "let people click it and expand it out full screen so they can
 * zoom around and figure out where to park.")
 *
 * Mouse: wheel to zoom at the pointer, drag to pan, double-click to zoom in.
 * Touch: pinch to zoom, one finger to pan. Keyboard: Esc closes, + and - zoom.
 * An "Open the file" link gives the browser's own zoom as a fallback.
 */
type Props = { src: string; alt?: string; style?: React.CSSProperties; title?: string };

const MIN = 1, MAX = 8;

export function ZoomableImage({ src, alt = "", style, title }: Props) {
  const [open, setOpen] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const stage = React.useRef<HTMLDivElement>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ dist: number; scale: number; cx: number; cy: number; tx: number; ty: number } | null>(null);
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const reset = React.useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);
  const show = () => { reset(); setOpen(true); track("image-expand", { src }); };
  const hide = React.useCallback(() => { setOpen(false); reset(); }, [reset]);

  // zoom so the point under (px, py) in stage coordinates stays put
  const zoomAt = React.useCallback((factor: number, px: number, py: number) => {
    setScale((s) => {
      const next = Math.min(MAX, Math.max(MIN, s * factor));
      const k = next / s;
      setTx((x) => px - (px - x) * k);
      setTy((y) => py - (py - y) * k);
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
      if (e.key === "+" || e.key === "=") zoomAt(1.25, centerX(), centerY());
      if (e.key === "-") zoomAt(0.8, centerX(), centerY());
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, hide, zoomAt]);

  const centerX = () => (stage.current?.clientWidth ?? 0) / 2;
  const centerY = () => (stage.current?.clientHeight ?? 0) / 2;
  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const p = local(e);
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx, ty };
      drag.current = null;
    } else {
      drag.current = { x: p.x, y: p.y, tx, ty };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      const next = Math.min(MAX, Math.max(MIN, g.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist)));
      const k = next / g.scale;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      setScale(next);
      setTx(mx - (g.cx - g.tx) * k);
      setTy(my - (g.cy - g.ty) * k);
    } else if (drag.current) {
      setTx(drag.current.tx + (p.x - drag.current.x));
      setTy(drag.current.ty + (p.y - drag.current.y));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) drag.current = null;
    else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      drag.current = { x: p.x, y: p.y, tx, ty };
    }
  };

  const btn: React.CSSProperties = {
    fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "0.08em", textTransform: "uppercase",
    background: "var(--paper-cream)", color: "var(--ink-black)", border: "var(--border-ink) solid var(--ink-black)",
    borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: "pointer", lineHeight: 1,
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={`Expand ${title ?? "the image"} to full screen`}
        style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", cursor: "zoom-in", position: "relative" }}
      >
        <img src={src} alt={alt} style={style} />
        <span
          aria-hidden
          style={{
            position: "absolute", right: 10, bottom: 10, fontFamily: "var(--font-label)", fontSize: "var(--label-sm)",
            letterSpacing: "0.08em", textTransform: "uppercase", background: "var(--ink-black)", color: "var(--paper-cream)",
            padding: "6px 10px", borderRadius: "var(--radius-sm)", opacity: 0.85,
          }}
        >
          ⤢ Tap to expand and zoom
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "Image"}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(23,21,18,0.94)", display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--paper-cream)", marginRight: "auto" }}>
              {title ?? "Zoom"} · scroll, pinch or drag
            </span>
            <button type="button" style={btn} onClick={() => zoomAt(1.25, centerX(), centerY())} aria-label="Zoom in">+</button>
            <button type="button" style={btn} onClick={() => zoomAt(0.8, centerX(), centerY())} aria-label="Zoom out">−</button>
            <button type="button" style={btn} onClick={reset}>Fit</button>
            <a href={src} target="_blank" rel="noopener" style={{ ...btn, textDecoration: "none" }}>Open the file</a>
            <button type="button" style={btn} onClick={hide} aria-label="Close">✕ Close</button>
          </div>
          <div
            ref={stage}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={(e) => { const p = local(e); zoomAt(1.6, p.x, p.y); }}
            style={{ flex: 1, overflow: "hidden", touchAction: "none", cursor: scale > 1 ? "grab" : "zoom-in", position: "relative" }}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              style={{
                position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "contain",
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: "0 0", userSelect: "none", pointerEvents: "none",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
