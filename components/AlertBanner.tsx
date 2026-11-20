import * as React from "react";
import type { EarAlert } from "@/lib/alerts";

// The Ear Alert doorway: a cream card with rust stars that runs full width under the
// masthead while an alert is open (design from Andy's planning page, 2026-11-20).
export function AlertBanner({ alert }: { alert: EarAlert }) {
  return (
    <a className="ear-alert-banner" href={`/alerts/${alert.slug}`}>
      <span className="ear-alert-star" aria-hidden="true">★</span>
      <span>
        <span>{alert.banner}</span>
        <span className="ear-alert-cta">Click here for more info <span aria-hidden="true">→</span></span>
      </span>
      <span className="ear-alert-star" aria-hidden="true">★</span>
    </a>
  );
}
