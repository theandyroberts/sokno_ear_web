import * as React from "react";
import type { Edition } from "@/lib/schema";
import { Masthead } from "@/components/Masthead";
import { Article } from "@/components/ds/Article.jsx";
import { StoryCard } from "@/components/ds/StoryCard.jsx";
import { CalendarItem } from "@/components/ds/CalendarItem.jsx";
import { SectionHeader } from "@/components/ds/SectionHeader.jsx";
import { Divider } from "@/components/ds/Divider.jsx";
import { ArticleBody } from "@/components/ArticleBody";
import { AudioBriefingPlayer } from "@/components/AudioBriefingPlayer";
import { EventSubmitForm } from "@/components/EventSubmitForm";
import { CallTheEarCard } from "@/components/CallTheEarCard";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ArticleSources } from "@/components/ArticleSources";
import { ShareStory } from "@/components/ShareStory";
import { JsonLd } from "@/components/JsonLd";

const Page = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>
);

const Well = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <section style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-lift)" }}>
    {title && (
      <div style={{ background: "var(--teal)", color: "var(--on-teal)", borderBottom: "var(--border-ink) solid var(--ink-black)", padding: "10px 16px", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ color: "var(--rust)" }}>★</span>{title}
      </div>
    )}
    <div style={{ padding: "4px 16px 8px" }}>{children}</div>
  </section>
);

export function Paper({ edition, permalinks = true }: { edition: Edition; permalinks?: boolean }) {
  const { feature, scanner, stories, sidebar } = edition;
  const volLine = `Vol. ${edition.volume} — No. ${edition.number}`;
  const dateline = `${edition.edition} · ${edition.dateLabel ?? edition.date} · ${edition.place}`;
  const shortDate = edition.shortDate ?? edition.dateLabel ?? edition.date;

  // Nav: Top + unique story labels (first occurrence) + Listen (if audio)
  const seen = new Set<string>();
  const storyNav = stories
    .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
    .map((s) => ({ id: s.id, label: s.label }));
  const sections = [
    { id: "top", label: "Top" },
    ...storyNav,
    ...(sidebar.audio ? [{ id: "listen", label: "Listen" }] : []),
    { id: "about", label: "About", href: "/about" },
  ];

  // Scanner columns: pick a count that never strands a single card alone on the last
  // row (orphan control). ≤5 cards → one row; 6+ → 4 wide, bumped to 5 when 4 would orphan.
  const scannerCols = scanner.length <= 5 ? scanner.length : (scanner.length % 4 === 1 ? 5 : 4);

  // Day filter: distinct days across the edition (ordered), rendered as a CSS-only filter bar.
  const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const daysAttr = (ds?: string[]) => (ds && ds.length ? ds.map((d) => d.toLowerCase()).join(" ") : undefined);
  const editionDays = DAY_ORDER.filter((d) => [feature, ...stories].some((s) => s.days?.includes(d)));

  return (
    <main id="top">
      <JsonLd edition={edition} />
      <Masthead volLine={volLine} dateline={dateline} shortDate={shortDate} sections={sections} days={editionDays} />

      {/* FEATURE BAND */}
      <div id="events" data-days={daysAttr(feature.days)} style={{ borderBottom: "var(--border-rule) double var(--ink-black)", padding: "28px 0 32px" }}>
        <Page>
          <div className="ear-twocol" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
            <Article id={feature.id} label={feature.label} labelColor={feature.labelColor} days={feature.days} image={feature.image} imageCaption={feature.imageCaption} title={feature.title} deck={feature.deck} facts={feature.facts} layout={feature.layout}>
              <ArticleBody blocks={feature.body} />
              <ArticleSources sources={feature.sources} />
              {permalinks && <ShareStory slug={edition.slug} id={feature.id} title={feature.title} />}
            </Article>
            <aside id="listen" style={{ display: "flex", flexDirection: "column", gap: 22, position: "sticky", top: 16 }}>
              {sidebar.audio && (
                <AudioBriefingPlayer title={sidebar.audio.title} intro={sidebar.audio.intro} description={sidebar.audio.description} duration={sidebar.audio.duration} src={sidebar.audio.src} />
              )}
              <Well title="What's Happening Soon">
                {sidebar.calendar.map((c, i) => (
                  <CalendarItem key={i} month={c.month} day={c.day} title={c.title} meta={c.meta} starred={c.starred} divider={i < sidebar.calendar.length - 1} />
                ))}
              </Well>
              <SubscribeForm />
            </aside>
          </div>
        </Page>
      </div>

      {/* SCANNER GRID */}
      <div style={{ padding: "30px 0", borderBottom: "var(--border-hair) solid var(--paper-edge)" }}>
        <Page>
          <SectionHeader>Top Stories &amp; Events</SectionHeader>
          <div className="ear-scanner" style={{ display: "grid", gap: 16, "--scanner-cols": scannerCols } as React.CSSProperties}>
            {scanner.map((c, i) => (
              <StoryCard key={i} label={c.label} labelColor={c.labelColor} days={c.days} data-days={daysAttr(c.days)} hot={c.hot} image={c.image} title={c.title} blurb={c.blurb} cue={c.cue} href={c.href} />
            ))}
          </div>
        </Page>
      </div>

      {/* INLINE STORIES */}
      <Page style={{ padding: "8px 24px" }}>
        {stories.map((s, i) => (
          <div key={s.id} data-days={daysAttr(s.days)}>
            {i > 0 && <Divider ornament="star" />}
            <section id={s.id} style={{ padding: "24px 0" }}>
              <SectionHeader>{s.label}</SectionHeader>
              <Article id={s.id} label={s.label} labelColor={s.labelColor} days={s.days} image={s.image} imageCaption={s.imageCaption} title={s.title} deck={s.deck} facts={s.facts} layout={s.layout}>
                <ArticleBody blocks={s.body} />
                <ArticleSources sources={s.sources} />
                {permalinks && <ShareStory slug={edition.slug} id={s.id} title={s.title} />}
              </Article>
            </section>
          </div>
        ))}
      </Page>

      {/* TELL THE EAR — bottom of the read, just above the footer */}
      <div style={{ borderTop: "var(--border-rule) double var(--ink-black)", padding: "32px 0 40px", marginTop: 8 }}>
        <Page>
          <div className="ear-twocol" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 28, alignItems: "start", maxWidth: 980, margin: "0 auto" }}>
            <EventSubmitForm />
            <CallTheEarCard />
          </div>
        </Page>
      </div>

    </main>
  );
}
