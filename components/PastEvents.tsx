"use client";
import * as React from "react";

/**
 * The past events on a venue, place, day or search page: handed the rows (and
 * anything that belongs under them, like the day page's load-more link), shown
 * collapsed to about three rows' height with the bottom fading into the page
 * (a mask on the well, see .ear-past--closed in globals.css, so the paper's own
 * texture shows through) and one text button over the fade. One click opens the
 * whole list and the fade goes. Three rows or fewer never collapse — there is
 * nothing to hide.
 *
 * Server-rendered collapsed, so without JavaScript the first rows still show and
 * the button sits there inert; `defaultOpen` keeps the list open when the page
 * itself has been asked for more (the day page's ?weeks=).
 */
export function PastEvents({ count, defaultOpen = false, children }: { count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const collapsible = count > 3;
  const [open, setOpen] = React.useState(defaultOpen || !collapsible);
  return (
    <div className={`ear-past${open ? " ear-past--open" : " ear-past--closed"}`}>
      <div className="ear-past-well">{children}</div>
      {!open && (
        <div className="ear-past-fade">
          <button type="button" className="ear-past-reveal" aria-expanded={false} onClick={() => setOpen(true)}>
            Click to see the old stuff
          </button>
        </div>
      )}
    </div>
  );
}
