import type { z } from "zod";
import type { Ticket } from "@/lib/schema";

/** Reuse the venue artwork and supply each event's destination in its story data. */
export function TicketLink({ href, image, alt }: z.infer<typeof Ticket>) {
  return (
    <div className="ear-ticket">
      <a className="ear-ticket-link" href={href} target="_blank" rel="noopener noreferrer"
        aria-label={`${alt} (opens in a new tab)`}>
        {/* Native SVG image keeps its lettering sharp at every size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={alt} width={800} height={440} />
        <span className="ear-ticket-caption">Get tickets <span aria-hidden="true">↗</span></span>
      </a>
    </div>
  );
}
