import Link from "next/link";
import type { Metadata } from "next";
import { SubmitterForm } from "@/components/SubmitterForm";

export const metadata: Metadata = {
  title: "Verified Submitter · The South Knoxville Ear",
  description: "Register to review drafts of the events and news you send in to The South Knoxville Ear.",
  alternates: { canonical: "/submitter" },
};

const p: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)", lineHeight: "var(--leading-body)",
  color: "var(--ink-black)", margin: "0 0 var(--space-4)",
};

export default function SubmitterPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "56px 24px 72px" }}>
      <p style={{ fontFamily: "var(--font-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", fontSize: "var(--label-md)", margin: "0 0 6px", textAlign: "center" }}>
        ★ The Ear&apos;s Sources
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 2.75rem)", lineHeight: 1.05, textTransform: "uppercase", color: "var(--ink-black)", margin: "0 0 var(--space-5)", textAlign: "center" }}>
        Review your own stories
      </h1>
      <p style={p}>
        When you phone in an event or send one through the form, The Ear writes it up as a draft.
        Register here and we&apos;ll match your phone or email to your submissions and send you a
        private link to read the draft and comment — correct a time, fix a name, add what we missed —
        before it runs.
      </p>
      <div style={{ margin: "var(--space-5) 0" }}>
        <SubmitterForm />
      </div>
      <p style={{ marginTop: "var(--space-5)", textAlign: "center" }}>
        <Link href="/">&#9733; Back to this week&rsquo;s Ear</Link>
      </p>
    </main>
  );
}
