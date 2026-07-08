import { getBySlug, getDraftBySlug, promoteStory } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// One page per story per edition: /{slug}/{storyId} renders the week with that
// story promoted to the feature and the rest shuffled down — a shareable deep link.
// Draft editions resolve too (noindex) so links shared from /next survive publish.
// Rendered at request time so publishing is a file sync — no rebuild.
export const dynamic = "force-dynamic";

function resolveEdition(slug: string): { edition: ReturnType<typeof getBySlug>; isDraft: boolean } {
  const published = getBySlug(undefined, slug);
  if (published) return { edition: published, isDraft: false };
  return { edition: getDraftBySlug(slug), isDraft: true };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; story: string }> }): Promise<Metadata> {
  const { slug, story } = await params;
  const { edition, isDraft } = resolveEdition(slug);
  const promoted = edition ? promoteStory(edition, story) : null;
  if (!promoted) return {};
  const f = promoted.feature;
  const title = `${f.title} — The South Knoxville Ear`;
  const description = f.deck ?? f.title;
  const image = f.image ?? "/assets/masthead.jpg";
  return {
    title,
    description,
    // Consolidate SEO to the edition; these are shareable alternate orderings of it.
    alternates: { canonical: `/${slug}` },
    ...(isDraft ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title, description, type: "article",
      url: `https://soknoear.com/${slug}/${story}`,
      siteName: "The South Knoxville Ear", images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string; story: string }> }) {
  const { slug, story } = await params;
  const { edition } = resolveEdition(slug);
  const promoted = edition ? promoteStory(edition, story) : null;
  if (!promoted) notFound();
  return <Paper edition={promoted} />;
}
