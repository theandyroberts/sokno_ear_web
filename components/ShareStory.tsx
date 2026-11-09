"use client";
import * as React from "react";

/**
 * Share affordance for a single story. The whole point is to hand the reader a
 * shareable permalink — /{slug}/{id}, which opens the episode with THIS story
 * promoted to the top for whoever receives it.
 *
 * Progressive enhancement, and every path ends with something the reader can see
 * (Andy, 2026-11-09: in the desktop app's browser pane the link "did nothing" —
 * no Web Share there, the clipboard refused, and the old window.prompt fallback
 * was swallowed):
 *  1. A touch device with the Web Share API → the OS share sheet (Messages,
 *     WhatsApp, Mail…). A dismissed sheet is the reader's choice, nothing more.
 *  2. A desktop, or a share sheet that fails → copy the absolute URL and confirm
 *     inline with "Link copied!". Desktops copy rather than share: Windows' and
 *     macOS' share dialogs are a detour when every desktop reader wants the link.
 *  3. Clipboard refused (an embedded browser, a locked-down page, no focus) → the
 *     link appears in a small read-only field, selected, with a line saying so.
 *  4. It stays a real <a href> underneath, so right-click "copy link", cmd/ctrl-
 *     click "open in new tab", no-JS, and crawlers all keep working — we only
 *     intercept a plain left click.
 */
type ShareState = "idle" | "copied" | "manual";

function canUseShareSheet(url: string): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare === "function" && !navigator.canShare({ url })) return false;
  // Desktops copy (see above); a touch screen gets the sheet it expects.
  const touch = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const noClipboard = typeof navigator.clipboard?.writeText !== "function";
  return touch || noClipboard;
}

/** Copy `text`: the async clipboard first, then the old execCommand route some
 *  embedded browsers still need. True when one of them took it. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* refused — try the legacy route */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = typeof document.execCommand === "function" && document.execCommand("copy");
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export function ShareStory({ slug, id, title }: { slug: string; id: string; title?: string }) {
  const [state, setState] = React.useState<ShareState>("idle");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const href = `/${slug}/${id}`;
  const fieldId = `share-${slug}-${id}`;

  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  React.useEffect(() => {
    if (state !== "manual") return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [state]);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let modified / non-primary clicks do their native thing (new tab, etc.).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    const url = typeof window !== "undefined" ? window.location.origin + href : href;
    const shareTitle = title ? `${title} — The South Knoxville Ear` : "The South Knoxville Ear";

    if (canUseShareSheet(url)) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (err) {
        // The reader closed the sheet: done. Anything else falls through to copying.
        if ((err as { name?: string } | null)?.name === "AbortError") return;
      }
    }

    if (await copyText(url)) {
      setState("copied");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), 2200);
      return;
    }

    setState("manual");
  }

  const absolute = typeof window !== "undefined" ? window.location.origin + href : href;
  const label = state === "copied" ? "Link copied!" : state === "manual" ? "Copy this link" : "Share this story";

  return (
    <div className="ear-share" style={{ marginTop: "var(--space-3, 12px)" }}>
      <a
        href={href}
        onClick={handleClick}
        aria-label={state === "copied" ? "Link copied" : "Share this story"}
        aria-live="polite"
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
        <span aria-hidden>★</span> {label}
      </a>
      {state === "manual" && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px" }}>
          <label htmlFor={fieldId} style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-faded)" }}>
            Copying is blocked here. Select the link and copy it:
          </label>
          <input
            id={fieldId}
            ref={inputRef}
            type="text"
            readOnly
            value={absolute}
            onFocus={(ev) => ev.currentTarget.select()}
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--ink-black)",
              background: "var(--paper-cream)",
              border: "var(--border-hair) solid var(--ink-black)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 8px",
            }}
          />
        </div>
      )}
    </div>
  );
}
