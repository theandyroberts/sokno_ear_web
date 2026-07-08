import { getLatest } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import type { Metadata } from "next";

// Editions render at request time so publishing a new issue is a file sync — no rebuild.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const e = getLatest();
  const title = `The South Knoxville Ear — ${e.dateLabel ?? e.date}`;
  const description = e.feature.deck ?? e.feature.title;
  return {
    title, description,
    alternates: { canonical: "/" },
    openGraph: {
      title, description, type: "website", url: "https://soknoear.com",
      siteName: "The South Knoxville Ear", images: ["/assets/masthead.jpg"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/masthead.jpg"] },
  };
}
export default function Home() {
  return <Paper edition={getLatest()} />;
}
