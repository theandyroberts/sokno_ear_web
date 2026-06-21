import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "About · The South Knoxville Ear",
  description: "Who's behind The South Knoxville Ear, and how to reach us.",
  alternates: { canonical: "/about" },
};

const p: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)", lineHeight: "var(--leading-body)",
  color: "var(--ink-black)", margin: "0 0 var(--space-4)",
};

const figcap: React.CSSProperties = {
  fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase", color: "var(--rust)", marginTop: 8,
};

function Figure({ src, alt, caption, maxWidth }: { src: string; alt: string; caption: string; maxWidth: number }) {
  return (
    <figure style={{ margin: "0 auto var(--space-5)", maxWidth, textAlign: "center" }}>
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
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 72px" }}>
      <p style={{ fontFamily: "var(--font-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", fontSize: "var(--label-md)", margin: "0 0 6px" }}>
        ★ About The Ear
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.05, textTransform: "uppercase", color: "var(--ink-black)", margin: "0 0 var(--space-5)" }}>
        Made by a neighbor
      </h1>

      <Figure
        src="/assets/spots/andy_serena_formal.jpg"
        alt="Engraving of Andy Roberts and his white shepherd Serena seated together on the couch"
        caption="Andy &amp; Serena"
        maxWidth={440}
      />

      <p style={p}>
        Made by long-time SoKno resident (and South-Young High grad) Andy Roberts, so he&apos;ll know
        what&apos;s happening when he drives down to Sevier Avenue each weekend — and to spread the
        word about all the great events down on the South Waterfront.
      </p>
      <p style={p}>
        By day, Andy works in AI and web marketing. He&apos;s Principal Email Developer and AI
        researcher at Providence Health, runs AI-powered web marketing at{" "}
        <a href="https://note15.com" target="_blank" rel="noopener noreferrer">Note Fifteen</a>, and
        helps founders and small businesses put AI to practical use at{" "}
        <a href="https://sparkpoint.studio" target="_blank" rel="noopener noreferrer">Spark Point Studio</a>.
      </p>

      <Figure
        src="/assets/spots/andy_serena_candid.jpg"
        alt="Engraving of Serena the dog licking a laughing Andy on the couch"
        caption="Serena, chief morale officer"
        maxWidth={380}
      />

      <p style={p}>
        The Ear is a bit of a busman&apos;s holiday: a practical-AI experiment pointed straight at his
        own neighborhood. The research, the writing, the spot art, and the weekly audio are all
        AI-assisted — then read over by a human who actually lives here. Basically, he&apos;s your
        friendly neighborhood AI man.
      </p>

      <Figure
        src="/assets/spots/serena.jpg"
        alt="Engraving head portrait of Serena, a white shepherd dog"
        caption="Serena says hi"
        maxWidth={190}
      />

      <div style={{ margin: "var(--space-7) 0 var(--space-5)" }}>
        <ContactForm />
      </div>

      <p style={{ marginTop: "var(--space-5)" }}>
        <Link href="/">&#9733; Back to this week&rsquo;s Ear</Link>
      </p>
    </main>
  );
}
