import React from "react";
import { Tag } from "../core/Tag.jsx";

/**
 * Article — a full inline story for the one-page weekly paper. Everything is
 * right there: section rubric, engraving, headline, deck, optional event facts,
 * and the full body. No "read more", no new page. Lay images and body in a
 * two-column print measure on wide screens.
 */
export function Article({
  id,
  label,
  labelColor = "rust",
  image,
  imageCaption,
  title,
  deck,
  facts = [],
  children,
  layout = "wrap",
  style = {},
  ...rest
}) {
  const figure = image && (
    <figure
      style={{
        margin: 0,
        float: layout === "wrap" ? "left" : "none",
        width: layout === "wrap" ? "min(42%, 340px)" : "100%",
        marginRight: layout === "wrap" ? "var(--space-5)" : 0,
        marginBottom: "var(--space-4)",
      }}
    >
      <div
        style={{
          border: "var(--border-ink) solid var(--ink-black)",
          background: "var(--paper-cream)",
          padding: "6px",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        <img
          src={image}
          alt=""
          style={{ width: "100%", display: "block", borderRadius: "calc(var(--radius-md) - 4px)", filter: "saturate(0.9) contrast(1.05)" }}
        />
      </div>
      {imageCaption && (
        <figcaption
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "var(--label-sm)",
            letterSpacing: "var(--tracking-label-tight)",
            textTransform: "uppercase",
            color: "var(--ink-faded)",
            marginTop: "6px",
            textAlign: "center",
          }}
        >
          {imageCaption}
        </figcaption>
      )}
    </figure>
  );

  return (
    <article id={id} style={{ ...style }} {...rest}>
      {label && <div style={{ marginBottom: "10px" }}><Tag color={labelColor}>{label}</Tag></div>}
      <h2
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: "var(--display-3)",
          lineHeight: 1.12,
          letterSpacing: "0",
          color: "var(--ink-black)",
          margin: "0 0 10px",
          textWrap: "balance",
        }}
      >
        {title}
      </h2>
      {deck && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: "var(--text-deck)",
            lineHeight: 1.35,
            color: "var(--ink-black)",
            margin: "0 0 var(--space-4)",
          }}
        >
          {deck}
        </p>
      )}

      {facts.length > 0 && (
        <dl
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 22px",
            margin: "0 0 var(--space-4)",
            padding: "10px 14px",
            background: "var(--paper-shadow)",
            border: "var(--border-hair) solid var(--ink-black)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {facts.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5em", alignItems: "baseline" }}>
              <dt
                style={{
                  fontFamily: "var(--font-label)",
                  fontWeight: "var(--weight-label)",
                  fontSize: "var(--label-sm)",
                  letterSpacing: "var(--tracking-label-tight)",
                  textTransform: "uppercase",
                  color: "var(--rust)",
                  margin: 0,
                }}
              >
                {f.label}
              </dt>
              <dd style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-black)", margin: 0 }}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-body)",
          color: "var(--ink-black)",
        }}
      >
        {figure}
        {children}
        <div style={{ clear: "both" }} />
      </div>
    </article>
  );
}
