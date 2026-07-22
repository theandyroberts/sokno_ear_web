import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, getStoryDraftByToken } from "@/lib/db";
import { Tag } from "@/components/ds/Tag.jsx";
import { DraftCommentForm } from "@/components/DraftCommentForm";
import type { StoryDraft } from "@/lib/story-drafter";

// Token-addressed draft review pages read the DB per request and must never be indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft for review · The South Knoxville Ear",
  robots: { index: false, follow: false },
};

const p: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)", lineHeight: "var(--leading-body)",
  color: "var(--ink-black)", margin: "0 0 var(--space-4)",
};

export default async function DraftReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = getStoryDraftByToken(db(), token);
  if (!row) notFound();
  const draft = JSON.parse(row.draft_json) as StoryDraft;
  const questions = draft.followUpQuestions ?? [];

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 72px" }}>
      <p style={{ fontFamily: "var(--font-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", fontSize: "var(--label-md)", margin: "0 0 4px", textAlign: "center" }}>
        ★ The South Knoxville Ear · Draft for review
      </p>
      <p style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: "var(--ink-faded)", margin: "0 0 var(--space-6)", textAlign: "center" }}>
        Not published — the city desk decides what runs in the Ear
      </p>

      <article style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lift)", padding: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <Tag color="rust">{draft.label}</Tag>
          {(draft.days ?? []).map((d, i) => (
            <Tag key={i} color="ink" variant="outline" size="sm">{d}</Tag>
          ))}
        </div>
        <h1 style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--display-3)", lineHeight: 1.12, color: "var(--ink-black)", margin: "0 0 10px" }}>
          {draft.title}
        </h1>
        {draft.deck && (
          <p style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--text-deck)", lineHeight: 1.35, color: "var(--ink-black)", margin: "0 0 var(--space-4)" }}>
            {draft.deck}
          </p>
        )}
        {(draft.facts ?? []).length > 0 && (
          <dl style={{ display: "flex", flexWrap: "wrap", gap: "6px 22px", margin: "0 0 var(--space-4)", padding: "10px 14px", background: "var(--paper-shadow)", border: "var(--border-hair) solid var(--ink-black)", borderRadius: "var(--radius-sm)" }}>
            {draft.facts.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5em", alignItems: "baseline" }}>
                <dt style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: "var(--rust)", margin: 0 }}>{f.label}</dt>
                <dd style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-black)", margin: 0 }}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {(draft.paragraphs ?? []).map((text, i) => (
          <p key={i} style={p}>{text}</p>
        ))}
      </article>

      {questions.length > 0 && (
        <section style={{ margin: "var(--space-5) 0", padding: "14px 18px", border: "var(--border-hair) solid var(--ink-black)", borderRadius: "var(--radius-sm)", background: "var(--paper-cream)" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", marginBottom: 8 }}>
            ★ Before this runs, the city desk still needs:
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
            {questions.map((q, i) => (
              <li key={i} style={{ ...p, margin: "0 0 6px" }}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      <div style={{ margin: "var(--space-5) 0" }}>
        <DraftCommentForm token={token} />
      </div>

      <p style={{ marginTop: "var(--space-5)", textAlign: "center" }}>
        <Link href="/">&#9733; Read this week&rsquo;s Ear</Link>
      </p>
    </main>
  );
}
