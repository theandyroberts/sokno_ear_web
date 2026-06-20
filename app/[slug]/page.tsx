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
  return e ? { title: `The South Knoxville Ear — ${e.dateLabel ?? e.date}` } : {};
}
export default async function EditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = getBySlug(undefined, slug);
  if (!edition) notFound();
  return <Paper edition={edition} />;
}
