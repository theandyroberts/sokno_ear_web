import Link from "next/link";
import type { Metadata } from "next";
import { getLatest } from "@/lib/episodes";
import { Masthead } from "@/components/Masthead";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "About · The South Knoxville Ear",
  description:
    "What The South Knoxville Ear is — a free weekly paper of events and neighborhood news for South Knoxville — and how to send in news for a future issue.",
  alternates: { canonical: "/about" },
};

const p: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)", lineHeight: "var(--leading-body)",
  color: "var(--ink-black)", margin: "0 0 var(--space-4)",
};

const figcap: React.CSSProperties = {
  fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase", color: "var(--rust)", marginTop: 8, textAlign: "center",
};

function Figure({ src, alt, caption, maxWidth }: { src: string; alt: string; caption: string; maxWidth: number }) {
  return (
    <figure style={{ margin: "0 auto var(--space-4)", maxWidth, textAlign: "center" }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%", height: "auto", display: "block",
          border: "var(--border-ink) solid var(--ink-black)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lift)",
        }}
      />
      <figcaption style={figcap}>{caption}</figcaption>
    </figure>
  );
}

export default function About() {
  const e = getLatest();
  const volLine = `Vol. ${e.volume} — No. ${e.number}`;
  const dateline = `${e.episode} · ${e.dateLabel ?? e.date} · ${e.place}`;
  const shortDate = e.shortDate ?? e.dateLabel ?? e.date;

  return (
    <main id="top">
      <Masthead
        volLine={volLine}
        dateline={dateline}
        shortDate={shortDate}
        sections={[{ id: "home", label: "Back to Home", href: "/" }]}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 64px" }}>
        <p style={{ fontFamily: "var(--font-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", fontSize: "var(--label-md)", margin: "0 0 6px", textAlign: "center" }}>
          ★ About The Ear
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.05, textTransform: "uppercase", color: "var(--ink-black)", margin: "0 0 var(--space-6)", textAlign: "center" }}>
          Made for the neighborhood
        </h1>

        {/* Block 1 — mission/value text (left) + the caretakers (right) */}
        <div className="ear-twocol" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.65fr) minmax(0, 1fr)", gap: 40, alignItems: "start", marginBottom: "var(--space-6)" }}>
          <div>
            <p style={p}>
              The South Knoxville Ear is a free weekly paper for one stretch of Knoxville — Sevier
              Avenue and Old Sevier, Kern&apos;s, Ijams, Island Home, the South Waterfront, and the
              Urban Wilderness. Every weekend it gathers what&apos;s actually happening close to home:
              festivals and grand openings, trail walks and porch concerts, road closures and the
              neighborhood news you&apos;d otherwise catch a week too late.
            </p>
            <p style={p}>
              It&apos;s built to be useful, not endless — one page you can read in a sitting, with a
              short audio briefing for the porch or the car, a &ldquo;what&apos;s happening soon&rdquo;
              calendar, and a Past Episodes archive when you want to look back. It&apos;s free,
              there&apos;s nothing to sign up for, and anyone can send in an event or a piece of news
              for a future issue.
            </p>
            <p style={p}>
              The whole point is simple: help neighbors run into the good stuff on purpose instead of
              by accident — and send a few more people down to Sevier Avenue and the South Waterfront
              on a Saturday.
            </p>
          </div>
          <Figure
            src="/assets/spots/andy_serena_formal.jpg"
            alt="Stipple hedcut portrait of Andy Roberts and his dog Serena"
            caption="Andy &amp; Serena, current caretakers"
            maxWidth={380}
          />
        </div>

        {/* Block 2 — Serena (left) + the caretaker note (right) */}
        <div className="ear-twocol" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.65fr)", gap: 40, alignItems: "start", marginBottom: "var(--space-7)" }}>
          <Figure
            src="/assets/spots/serena.jpg"
            alt="Stipple portrait of Serena, a white shepherd dog"
            caption="Serena says hi"
            maxWidth={260}
          />
          <div>
            <p style={p}>
              The Ear is currently tended by a neighbor — long-time SoKno resident and South-Young High
              grad Andy Roberts, who&apos;s driving down to the river most weekends anyway. By day he
              works in AI and web marketing (at{" "}
              <a href="https://note15.com" target="_blank" rel="noopener noreferrer">Note Fifteen</a>{" "}
              and <a href="https://sparkpoint.studio" target="_blank" rel="noopener noreferrer">Spark Point Studio</a>),
              and the Ear is a practical-AI experiment aimed at his own backyard: the research, writing,
              spot art, and audio are AI-assisted, then read over by a human who actually lives here.
              He&apos;s just the current caretaker — the neighborhood is the point.
            </p>
            <p style={p}>
              And he doesn&apos;t do it alone. Serena — chief morale officer, four legs, zero bylines —
              supervises every issue from the couch. The best tips come from neighbors, though: if you
              know about a grand opening, a fundraiser, a road closure, or a porch show the rest of us
              would want in on, that&apos;s exactly what the Ear is for. Send it along.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <ContactForm />
          <p style={{ marginTop: "var(--space-5)", textAlign: "center" }}>
            <Link href="/">&#9733; Back to this week&rsquo;s Ear</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
