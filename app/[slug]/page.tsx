import { getBySlug, loadEditions } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export function generateStaticParams() {
  return loadEditions().map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getBySlug(undefined, slug);
  if (!e) return {};
  const title = `The South Knoxville Ear — ${e.dateLabel ?? e.date}`;
  const description = e.feature.deck ?? e.feature.title;
  return {
    title, description,
    alternates: { canonical: `/${e.slug}` },
    openGraph: {
      title, description, type: "website", url: `https://soknoear.com/${e.slug}`,
      siteName: "The South Knoxville Ear", images: ["/assets/masthead.jpg"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/assets/masthead.jpg"] },
  };
}
export default async function EditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = getBySlug(undefined, slug);
  if (!edition) notFound();
  return <Paper edition={edition} />;
}
