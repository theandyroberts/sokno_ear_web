import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLatest } from "@/lib/episodes";
import { getAlert, isClosed, earToday } from "@/lib/alerts";
import { Masthead } from "@/components/Masthead";
import { SubscribeForm } from "@/components/SubscribeForm";

// Read at request time so an alert is a content sync, like an episode.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getAlert(slug);
  if (!a) return { title: "Not found · The South Knoxville Ear" };
  const title = `${a.title} · The South Knoxville Ear`;
  const description = a.deck ?? a.body[0];
  const images = [a.image ?? "/assets/masthead.jpg"];
  return {
    title, description,
    alternates: { canonical: `/alerts/${a.slug}` },
    openGraph: { title, description, type: "article", url: `https://soknoear.com/alerts/${a.slug}`, siteName: "The South Knoxville Ear", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function AlertPage({ params }: Props) {
  const { slug } = await params;
  const a = getAlert(slug);
  if (!a) notFound();
  const e = getLatest();
  const closed = isClosed(a, earToday());

  return (
    <main id="top">
      <Masthead
        volLine={`Ear Alert · ${e.shortDate ?? e.dateLabel ?? e.date}`}
        dateline={`${e.episode} · ${e.dateLabel ?? e.date} · ${e.place}`}
        shortDate={e.shortDate ?? e.dateLabel ?? e.date}
        sections={[{ id: "home", label: "Back to Home", href: "/" }]}
      />
      <article className="ear-alert-page">
        <a className="ear-alert-back" href="/">← Back to this week&rsquo;s Ear</a>
        <div><span className="ear-alert-pill">{a.label}</span></div>
        <h1>{a.title}</h1>
        {a.deck && <p className="ear-alert-deck">{a.deck}</p>}
        {closed && a.closedNote && <p className="ear-alert-closed">{a.closedNote}</p>}
        {a.image && (
          <figure className="ear-alert-figure">
            <img src={a.image} alt={a.imageAlt ?? ""} width={1350} height={900} />
          </figure>
        )}
        {a.body.map((para, i) => <p key={i} className="ear-alert-body">{para}</p>)}
        {a.cta && !closed && (
          <a className="ear-alert-button" href={a.cta.href} target="_blank" rel="noopener">
            {a.cta.text} <span aria-hidden="true">→</span>
          </a>
        )}
        {a.links && a.links.length > 0 && (
          <p className="ear-alert-links">
            {a.links.map((l, i) => (
              <React.Fragment key={l.href}>
                {i > 0 && " · "}
                <a href={l.href} target="_blank" rel="noopener">{l.text}</a>
              </React.Fragment>
            ))}
          </p>
        )}
        <div style={{ marginTop: 36 }}>
          <SubscribeForm />
        </div>
      </article>
    </main>
  );
}
