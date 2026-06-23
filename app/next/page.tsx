import { getNext } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preview · The South Knoxville Ear",
  description: "Preview of the upcoming edition — not yet published.",
  robots: { index: false, follow: false },
};

export default function NextPreview() {
  const edition = getNext();
  if (!edition) notFound();
  return (
    <>
      <div
        style={{
          background: "var(--rust)", color: "var(--on-rust)", textAlign: "center",
          padding: "9px 16px", fontFamily: "var(--font-label)", fontSize: "var(--label-md)",
          letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
        }}
      >
        ★ Preview — publishes Wednesday · not the live edition
      </div>
      <Paper edition={edition} permalinks={false} />
    </>
  );
}
