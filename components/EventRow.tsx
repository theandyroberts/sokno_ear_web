import Link from "next/link";
import { timeCell, type ArticleEntry } from "@/lib/search";

/**
 * One event on a venue, place or day page: the start time in a narrow column, a tiny thumbnail of the story's art, the
 * headline (two lines at most, then an ellipsis), a dim line under it, and on the
 * right the ticket as a small link when the story has one. Thumbnail and headline go
 * to the article; the ticket opens the venue's ticket page in a new tab.
 */
export function EventRow({ article, sub }: { article: ArticleEntry; sub: string }) {
  const { href, title, image, ticket } = article;
  return (
    <li className="ear-event-row">
      <span className="ear-event-time">{timeCell(article)}</span>
      <Link href={href} className="ear-event-thumb" aria-hidden="true" tabIndex={-1}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        ) : (
          <span className="ear-event-thumb-blank" />
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
