import { getNext } from "@/lib/episodes";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Reads the drafts folder per request — new drafts appear without a rebuild.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview · The South Knoxville Ear",
  description: "Preview of the upcoming episode — not yet published.",
  robots: { index: false, follow: false },
};

export default function NextPreview() {
  const episode = getNext();
  if (!episode) notFound();
  return (
    <>
      <div
        style={{
          background: "var(--rust)", color: "var(--on-rust)", textAlign: "center",
          padding: "9px 16px", fontFamily: "var(--font-label)", fontSize: "var(--label-md)",
          letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
        }}
      >
        ★ Preview — publishes Wednesday · not the live episode
      </div>
      <Paper episode={episode} />
    </>
  );
}
