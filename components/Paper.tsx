import * as React from "react";
import type { Episode } from "@/lib/schema";
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
import { PartyMapCard } from "@/components/PartyMapCard";
import { DirtySouthCard } from "@/components/DirtySouthCard";
import { ArticleSources } from "@/components/ArticleSources";
import { ShareStory } from "@/components/ShareStory";
import { JsonLd } from "@/components/JsonLd";
import { calendarRowDay } from "@/lib/episodes";

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

export function Paper({ episode, permalinks = true, storyView = false }: { episode: Episode; permalinks?: boolean; storyView?: boolean }) {
  const { feature, scanner, stories, sidebar } = episode;
  const volLine = `Vol. ${episode.volume} — No. ${episode.number}`;
  const dateline = `${episode.episode} · ${episode.dateLabel ?? episode.date} · ${episode.place}`;
  const shortDate = episode.shortDate ?? episode.dateLabel ?? episode.date;

  // On a story permalink the other stories render as teasers, so in-page "#id"
  // anchors don't exist — send those links to the episode page instead.
  const resolveHref = (href?: string) =>
    storyView && href?.startsWith("#") ? `/${episode.slug}${href}` : href;

  // Nav: Top + unique story labels (first occurrence) + Listen (if audio)
  const seen = new Set<string>();
  const storyNav = stories
    .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
    .map((s) => ({ id: s.id, label: s.label, ...(storyView ? { href: `/${episode.slug}#${s.id}` } : {}) }));
  const sections = [
    { id: "top", label: "Top" },
    ...storyNav,
    ...(sidebar.audio ? [{ id: "listen", label: "Listen" }] : []),
    { id: "about", label: "About", href: "/about" },
  ];

  // Scanner columns: pick a count that never strands a single card alone on the last
  // row (orphan control). ≤5 cards → one row; 6+ → 4 wide, bumped to 5 when 4 would orphan.
  const scannerCols = scanner.length <= 5 ? scanner.length : (scanner.length % 4 === 1 ? 5 : 4);

  // Day filter: distinct days across the episode (ordered), rendered as a CSS-only filter bar.
  const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_FULL: Record<string, string> = {
    Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
    Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
  };
  const daysAttr = (ds?: string[]) => (ds && ds.length ? ds.map((d) => d.toLowerCase()).join(" ") : undefined);
  const episodeDays = DAY_ORDER.filter((d) => [feature, ...stories].some((s) => s.days?.includes(d)));

  // Calendar rows carry a stamped date, not a weekday — derive one so the day board can
  // filter them. Undatable rows get "none" so they hide under every day rather than
  // showing under all of them.
  const calendarRows = sidebar.calendar.map((c) => ({
    ...c,
    dayAttr: calendarRowDay(c.month, c.day, episode.date)?.toLowerCase() ?? "none",
  }));

  // Day bars. The rows stamp a date, not a weekday, and once the list runs past a dozen
  // a reader can't see where Thursday ends and Friday starts (Andy, 2026-09-22: "I had
  // to look five times to figure out there's only one thing on Friday"). A dark bar
  // heads each new date in both the sidebar and the day board.
  const sameDate = (a?: { month: string; day: string }, b?: { month: string; day: string }) =>
    !!a && !!b && a.month === b.month && a.day === b.day;
  const dayBarLabel = (c: { month: string; day: string }) => {
    const wd = calendarRowDay(c.month, c.day, episode.date);
    return `${wd ? `${DAY_FULL[wd]} · ` : ""}${c.month} ${c.day}`;
  };
  const renderCalendar = () =>
    calendarRows.map((c, i) => {
      const newDay = !sameDate(calendarRows[i - 1], c);
      const lastOfDay = !sameDate(c, calendarRows[i + 1]);
      return (
        <React.Fragment key={i}>
          {newDay && (
            <div className="ear-daybar" data-days={c.dayAttr} style={{ background: "var(--ink-black)", color: "var(--paper-cream)", fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", padding: "5px 10px", borderRadius: "var(--radius-sm)", margin: i === 0 ? "6px 0 6px" : "14px 0 6px" }}>
              {dayBarLabel(c)}
            </div>
          )}
          <CalendarItem data-days={c.dayAttr} month={c.month} day={c.day} title={c.title} meta={c.meta} starred={c.starred} href={resolveHref(c.href)} divider={!lastOfDay} />
        </React.Fragment>
      );
    });

  // With a long calendar the sidebar runs a screen or two past the feature and the main
  // column sits empty beside it (Andy, 2026-09-22). Lift the first story or two up into
  // the feature band so the column stays full; the rest run below the scanner as before.
  // Story permalinks never lift — their siblings are teasers, not articles.
  // Measured on No. 15 at 1360px: the feature runs ~1,550px, a lifted story ~1,200px, the
  // sidebar's ad + player ~570px and each calendar row (with its day bar) ~120px. The
  // feature alone covers ~14 rows; every ten rows past that is one more story.
  const liftCount = storyView ? 0 : Math.max(0, Math.floor((sidebar.calendar.length - 5) / 10));
  const lifted = stories.slice(0, liftCount);
  const rest = stories.slice(liftCount);
  const renderStory = (s: Episode["stories"][number], withDivider: boolean) => (
    <div key={s.id} data-days={daysAttr(s.days)}>
      {withDivider && <Divider ornament="star" />}
      <section id={s.id} style={{ padding: "24px 0" }}>
        <SectionHeader>{s.label}</SectionHeader>
        <Article id={s.id} label={s.label} labelColor={s.labelColor} days={s.days} image={s.image} imageCaption={s.imageCaption} title={s.title} deck={s.deck} facts={s.facts} layout={s.layout}>
          <ArticleBody blocks={s.body} />
          <ArticleSources sources={s.sources} />
          {permalinks && <ShareStory slug={episode.slug} id={s.id} title={s.title} />}
        </Article>
      </section>
    </div>
  );

  const dayPills = (
    <div className="ear-daynav ear-daynav--board">
      <span className="ear-daynav-label">See</span>
      <label htmlFor="df-all">All</label>
      {episodeDays.map((d) => (
        <label key={d} htmlFor={`df-${d.toLowerCase()}`}>{d}</label>
      ))}
    </div>
  );

  return (
    <main id="top">
      <JsonLd episode={episode} storyUrl={storyView ? `https://soknoear.com/${episode.slug}/${feature.id}` : undefined} />
      <Masthead volLine={volLine} dateline={dateline} shortDate={shortDate} sections={sections} days={episodeDays} />

      {/* Phones: the Dirty South doorway rides directly under the header (see globals.css) */}
      <div className="ds-card-mobile">
        <Page style={{ padding: "14px 24px 2px" }}>
          <DirtySouthCard />
        </Page>
      </div>

      {/* DAY BOARD — when a single day is picked, the calendar steps out of the sidebar and
          runs full width directly under the nav, so the chosen day always has something
          above the fold even if the feature isn't on that day. Hidden on "All". */}
      {episodeDays.length > 0 && (
        <div className="ear-dayboard" style={{ background: "var(--paper-shadow)", borderBottom: "var(--border-rule) double var(--ink-black)", padding: "20px 0 24px" }}>
          <Page>
            <section style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-lift)" }}>
              <div style={{ background: "var(--teal)", color: "var(--on-teal)", borderBottom: "var(--border-ink) solid var(--ink-black)", padding: "10px 16px", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ color: "var(--rust)" }}>★</span>
                {episodeDays.map((d) => (
                  <span key={d} data-days={d.toLowerCase()}>What&rsquo;s Happening {DAY_FULL[d] ?? d}</span>
                ))}
              </div>
              {dayPills}
              <div style={{ padding: "4px 16px 8px" }}>
                {renderCalendar()}
              </div>
            </section>
          </Page>
        </div>
      )}

      {/* FEATURE BAND */}
      <div id="events" data-days={daysAttr(feature.days)} style={{ borderBottom: "var(--border-rule) double var(--ink-black)", padding: "28px 0 32px" }}>
        <Page>
          <div className="ear-twocol" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
            <div className="ear-maincol">
              <Article id={feature.id} label={feature.label} labelColor={feature.labelColor} days={feature.days} image={feature.image} imageCaption={feature.imageCaption} title={feature.title} deck={feature.deck} facts={feature.facts} layout={feature.layout}>
                <ArticleBody blocks={feature.body} />
                <ArticleSources sources={feature.sources} />
                {permalinks && <ShareStory slug={episode.slug} id={feature.id} title={feature.title} />}
              </Article>
              {lifted.map((s) => renderStory(s, true))}
            </div>
            <aside id="listen" style={{ display: "flex", flexDirection: "column", gap: 22, position: "sticky", top: 16 }}>
              <div className="ds-card-desktop">
                <DirtySouthCard />
              </div>
              {sidebar.audio && (
                <AudioBriefingPlayer title={sidebar.audio.title} intro={sidebar.audio.intro} description={sidebar.audio.description} duration={sidebar.audio.duration} src={sidebar.audio.src} />
              )}
              <div className="ear-soon-aside">
              <Well title="What's Happening Soon">
                {renderCalendar()}
                {sidebar.calendar.some((c) => c.starred) && (
                  <div style={{ padding: "8px 4px 4px", fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--ink-faded)", textAlign: "right" }}>
                    <span aria-hidden style={{ color: "var(--rust)" }}>★</span> don&rsquo;t miss it
                  </div>
                )}
              </Well>
              </div>
            </aside>
          </div>
          {/* Below the feature: the map card and the signup ride side by side under the
              article instead of stacking in the sidebar, where they used to trail the
              feature by a screen of empty column (Andy, 2026-09-08). */}
          <div className="ear-belowfeature" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 36, alignItems: "stretch", marginTop: 32 }}>
            <PartyMapCard />
            <SubscribeForm />
          </div>
        </Page>
      </div>

      {/* SCANNER GRID — episode page only. On a story permalink this would repeat the
          whole weekend a second time (including a card for the story you're already
          reading); "More From This Weekend" below is the story page's version of it. */}
      {!storyView && (
        <div style={{ padding: "30px 0", borderBottom: "var(--border-hair) solid var(--paper-edge)" }}>
          <Page>
            <SectionHeader>Top Stories &amp; Events</SectionHeader>
            <div className="ear-scanner" style={{ display: "grid", gap: 16, "--scanner-cols": scannerCols } as React.CSSProperties}>
              {scanner.map((c, i) => (
                <StoryCard key={i} label={c.label} labelColor={c.labelColor} days={c.days} data-days={daysAttr(c.days)} hot={c.hot} image={c.image} title={c.title} blurb={c.blurb} cue={c.cue} href={resolveHref(c.href)} />
              ))}
            </div>
          </Page>
        </div>
      )}

      {/* INLINE STORIES — full articles on the episode page; on a story permalink the
          siblings render as teaser cards linking to their own pages, so each story
          page is mostly its own story (that's what lets them rank individually). */}
      {storyView ? (
        <div style={{ padding: "30px 0" }}>
          <Page>
            <SectionHeader>More From This Weekend</SectionHeader>
            <div className="ear-scanner" style={{ display: "grid", gap: 16, "--scanner-cols": stories.length <= 5 ? Math.max(stories.length, 1) : (stories.length % 4 === 1 ? 5 : 4) } as React.CSSProperties}>
              {stories.map((s) => (
                <StoryCard key={s.id} label={s.label} labelColor={s.labelColor} days={s.days} data-days={daysAttr(s.days)} image={s.image} title={s.title} blurb={s.deck} cue="Read the story" href={`/${episode.slug}/${s.id}`} />
              ))}
            </div>
          </Page>
        </div>
      ) : (
        <Page style={{ padding: "8px 24px" }}>
          {rest.map((s, i) => renderStory(s, i > 0))}
        </Page>
      )}

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
