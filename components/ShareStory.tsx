"use client";
import * as React from "react";

/**
 * Share affordance for a single story. The whole point is to hand the reader a
 * shareable permalink — /{slug}/{id}, which opens the edition with THIS story
 * promoted to the top for whoever receives it.
 *
 * Progressive enhancement, mid-2026 best practice:
 *  1. Web Share API (navigator.share) → the OS-native share sheet. This is what
 *     phones expect and where most sharing happens.
 *  2. No Web Share (many desktops) → copy the absolute URL to the clipboard and
 *     confirm inline with "Link copied!".
 *  3. It stays a real <a href> underneath, so right-click "copy link", cmd/ctrl-
 *     click "open in new tab", no-JS, and crawlers all keep working — we only
 *     intercept a plain left click.
 */
export function ShareStory({ slug, id, title }: { slug: string; id: string; title?: string }) {
  const [copied, setCopied] = React.useState(false);
  const href = `/${slug}/${id}`;

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let modified / non-primary clicks do their native thing (new tab, etc.).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    const url = typeof window !== "undefined" ? window.location.origin + href : href;
    const shareTitle = title ? `${title} — The South Knoxville Ear` : "The South Knoxville Ear";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url });
      } catch {
        /* user dismissed the share sheet, or it failed — nothing to do */
      }
      return;
    }

    // No Web Share → copy the link and confirm inline.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked (rare) — last resort so the reader can still grab it.
      window.prompt("Copy this link to share:", url);
    }
  }

  return (
    <div style={{ marginTop: "var(--space-3, 12px)" }}>
      <a
        href={href}
        onClick={handleClick}
        aria-label={copied ? "Link copied" : "Share this story"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-xs)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "var(--rust)",
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        <span aria-hidden>★</span> {copied ? "Link copied!" : "Share this story"}
      </a>
    </div>
  );
}
