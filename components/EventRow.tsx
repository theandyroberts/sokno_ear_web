import Link from "next/link";
import { dateCell, isUpcoming, type ArticleEntry } from "@/lib/search";

/**
 * One event on a search, venue, place or day page. Left to right: the date column
 * (day on one line, the time under it in the display face — the reader is checking
 * whether they can make it), a 56px thumbnail of the story's art (a cream tile with
 * the ★ when the story has none, so the column never collapses), the headline (two
 * lines at most, then an ellipsis) with a dim line under it, and on the right the
 * ticket as a small link when the story has one. Thumbnail and headline go to the
 * article; the ticket opens the venue's ticket page in a new tab.
 *
 * A row still to come is the prominent kind: full ink and a slightly larger
 * headline. One that has been is set smaller in faded ink. `upcoming` is worked
 * out from today's South Knoxville date unless the page says otherwise.
 */
export function EventRow({ article, sub, upcoming }: { article: ArticleEntry; sub: string; upcoming?: boolean }) {
  const { href, title, image, ticket } = article;
  const { day, time } = dateCell(article);
  const up = upcoming ?? isUpcoming(article);
  return (
    <li className={`ear-event-row ${up ? "ear-event-row--upcoming" : "ear-event-row--past"}`}>
      <span className="ear-event-date">
        <span className="ear-event-day">{day}</span>
        <span className="ear-event-time">{time}</span>
      </span>
      <Link href={href} className="ear-event-thumb" aria-hidden="true" tabIndex={-1}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        ) : (
          <span className="ear-event-thumb-blank">★</span>
        )}
      </Link>
      <div className="ear-event-text">
        <Link href={href} className="ear-event-title ear-clamp-2">{title}</Link>
        <div className="ear-event-sub">{sub}</div>
      </div>
      {ticket && (
        <a
          className="ear-ticket-link ear-event-ticket"
          href={ticket.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${ticket.alt} (opens in a new tab)`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ticket.image} alt="" width={800} height={440} />
        </a>
      )}
    </li>
  );
}
