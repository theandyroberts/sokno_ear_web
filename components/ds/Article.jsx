import React from "react";
import { Tag } from "./Tag.jsx";
import { ZoomableImage } from "../ZoomableImage";
import { TicketLink } from "../TicketLink";

/**
 * Article — a full inline story for the one-page weekly paper. Everything is
 * right there: section rubric, headline, deck, engraving, optional event facts,
 * and the full body. No "read more", no new page.
 *
 * Image placement depends on layout:
 * - imageTop  → hero directly under the headline/deck, ABOVE the facts strip.
 *   (A long facts strip otherwise buries the art halfway down the story.)
 * - imageLeft / imageRight → float inside the body so the copy wraps around it.
 */
export function Article({
  id,
  label,
  labelColor = "rust",
  days,
  image,
  imageCaption,
  imageZoom = false,
  ticket,
  venue = null,
  title,
  deck,
  facts = [],
  children,
  layout = "imageLeft",
  style = {},
  ...rest
}) {
  const floatVal = layout === "imageLeft" ? "left" : layout === "imageRight" ? "right" : "none";
  const isFloat = floatVal !== "none";
  const isHero = layout === "imageTop";
  const figure = image && layout !== "textOnly" && (
    <figure
      style={{
        margin: 0,
        float: floatVal,
        width: isFloat ? "min(42%, 340px)" : "100%",
        marginRight: floatVal === "left" ? "var(--space-5)" : 0,
        marginLeft: floatVal === "right" ? "var(--space-5)" : 0,
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
        {imageZoom ? (
          <ZoomableImage
            src={image}
            alt=""
            title={typeof title === "string" ? title : undefined}
            style={{ width: "100%", display: "block", borderRadius: "calc(var(--radius-md) - 4px)" }}
          />
        ) : (
          <img
            src={image}
            alt=""
            style={{ width: "100%", display: "block", borderRadius: "calc(var(--radius-md) - 4px)", filter: "saturate(0.9) contrast(1.05)" }}
          />
        )}
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

  /* The facts box: the where-and-when on the left, the venue's framed mark top right
     and, when the event sells tickets, the ticket under it (Andy, 2026-11-09: "add the
     framed venue logo into the when/where/ages box for every story", then "put the venue
     logo on the top right, the ticket icon below it"). The mark is the same ink-framed
     cream tile as the calendar's, at the ticket's 150px, and links to the venue's page.
     On a phone the right column gives way (app/globals.css; .ear-facts-wrap is the
     container). The box sits after the FIRST paragraph of the body, not under the deck,
     so the headline runs straight into the lede and the art (Andy, 2026-10-26). */
  const mark = venue && (
    <a
      className={`ear-venue-mark${venue.logo ? "" : " ear-venue-mark--wordmark"}`}
      href={`/venue/${venue.key}`}
      aria-label={`${venue.name}: every story in the Ear`}
    >
      {venue.logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={venue.logo} alt="" />
      ) : (
        <span>{venue.name}</span>
      )}
    </a>
  );
  const boxClass = ["ear-facts-box", mark && "ear-facts-box--logo", ticket && "ear-facts-box--ticket"].filter(Boolean).join(" ");
  const factsBox = (facts.length > 0 || ticket) ? (
        <div className="ear-facts-wrap">
        <div
          className={boxClass}
          style={{
            margin: "0 0 var(--space-4)",
            padding: "10px 14px",
            background: "var(--paper-shadow)",
            border: "var(--border-hair) solid var(--ink-black)",
            borderRadius: "var(--radius-sm)",
          }}
        >
        {mark}
        {facts.length > 0 && (
        <dl
          className="ear-facts"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 22px",
            margin: 0,
            alignContent: "center",
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
        {ticket && <TicketLink {...ticket} showCaption={false} />}
        </div>
        </div>
  ) : null;

  return (
    <article id={id} style={{ ...style }} {...rest}>
      {(label || (days && days.length > 0)) && (
        <div style={{ marginBottom: "10px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          {label && <Tag color={labelColor}>{label}</Tag>}
          {days && days.map((d, i) => <Tag key={i} color="ink" variant="outline" size="sm">{d}</Tag>)}
        </div>
      )}
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

      {isHero && figure}


      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-body)",
          color: "var(--ink-black)",
        }}
      >
        {!isHero && figure}
        {(() => {
          // Slot the facts box into the first element child (the ArticleBody) so it lands
          // after the lede; any other children (the sources line) follow untouched.
          if (!factsBox) return children;
          let placed = false;
          const out = React.Children.map(children, (c) => {
            if (!placed && React.isValidElement(c)) { placed = true; return React.cloneElement(c, { afterFirst: factsBox }); }
            return c;
          });
          return placed ? out : (<>{factsBox}{children}</>);
        })()}
        <div style={{ clear: "both" }} />
      </div>
    </article>
  );
}
