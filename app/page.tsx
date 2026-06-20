import { getLatest } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const e = getLatest();
  const title = `The South Knoxville Ear — ${e.dateLabel ?? e.date}`;
  const description = e.feature.deck ?? e.feature.title;
  return {
    title, description,
    alternates: { canonical: "/" },
    openGraph: {
      title, description, type: "website", url: "https://soknoear.com",
      siteName: "The South Knoxville Ear", images: ["/assets/masthead.png"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/masthead.png"] },
  };
}
export default function Home() {
  return <Paper edition={getLatest()} />;
}
