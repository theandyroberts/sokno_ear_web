import { getBySlug, getLatest } from "@/lib/episodes";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Episodes render at request time so publishing a new issue is a file sync — no rebuild.
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getBySlug(undefined, slug);
  if (!e) return {};
  const title = `The South Knoxville Ear — ${e.dateLabel ?? e.date}`;
  const description = e.feature.deck ?? e.feature.title;
  // The latest episode is a byte-for-byte twin of the homepage; pointing its canonical
  // at "/" keeps Google from seeing two pages claiming the same content. Once the next
  // episode publishes, this page's content is unique and the canonical returns to itself.
  const isLatest = getLatest().slug === e.slug;
  return {
    title, description,
    alternates: { canonical: isLatest ? "/" : `/${e.slug}` },
    openGraph: {
      title, description, type: "website", url: `https://soknoear.com/${e.slug}`,
      siteName: "The South Knoxville Ear", images: ["/assets/masthead.jpg"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/masthead.jpg"] },
  };
}
export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = getBySlug(undefined, slug);
  if (!episode) notFound();
  return <Paper episode={episode} />;
}
