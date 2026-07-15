"use client";
import React from "react";
import { Tag } from "./Tag.jsx";

/**
 * StoryCard — a bordered paper card with an engraving thumbnail, headline, and
 * a short blurb. Built for the "Top Stories & Events" scanner grid. On the
 * one-page paper it can jump to a section (href="#anchor") instead of a new
 * page — keep everything on the same scroll.
 *
 * The ENTIRE card is one link: readers tap the engraving, not the little cue
 * text. That means the card itself is the <a> (no nested anchors) and any
 * spread props — notably `data-days`, which the CSS day filter keys on — land
 * on it, so it stays the grid item.
 */
export function StoryCard({
  label,
  labelColor = "rust",
  days,
  hot = false,
  image,
  title,
  blurb,
  cue,
  href,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);

  return (
    <a
      href={href || "#"}
      aria-label={typeof title === "string" ? title : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-bright)",
        border: "var(--border-ink) solid var(--ink-black)",
        borderRadius: "var(--radius-md)",
        boxShadow: hover ? "var(--shadow-press)" : "none",
        transform: hover ? "translate(-1px,-1px)" : "none",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
    >
      {image && (
        <div
          style={{
            position: "relative",
            borderBottom: "var(--border-hair) solid var(--ink-black)",
            background: "var(--paper-cream)",
            aspectRatio: "4 / 3",
            overflow: "hidden",
          }}
        >
          <img
            src={image}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.92) contrast(1.04)" }}
          />
          {hot && (
            <span style={{ position: "absolute", top: 8, left: 8 }}>
              <Tag color="rust" size="sm" star>Hot</Tag>
            </span>
          )}
        </div>
      )}

      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        {(label || (days && days.length > 0)) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
            {label && <Tag color={labelColor} size="sm">{label}</Tag>}
            {days && days.map((d, i) => <Tag key={i} color="ink" variant="outline" size="sm">{d}</Tag>)}
          </div>
        )}
        <h3
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: "1.1875rem",
            lineHeight: 1.14,
            margin: 0,
            color: "var(--ink-black)",
          }}
        >
          {title}
        </h3>
        {blurb && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5, color: "var(--ink-faded)", margin: 0 }}>
            {blurb}
          </p>
        )}
        {cue && (
          <div style={{ marginTop: "auto" }}>
            <span
              style={{
                fontFamily: "var(--font-label)",
                fontWeight: "var(--weight-label)",
                fontSize: "var(--label-sm)",
                letterSpacing: "var(--tracking-label-tight)",
                textTransform: "uppercase",
                color: "var(--link)",
                display: "inline-flex",
                gap: "0.4em",
                alignItems: "center",
                textDecoration: hover ? "underline" : "none",
              }}
            >
              {cue} <span aria-hidden="true">→</span>
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
