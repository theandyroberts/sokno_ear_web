import { getBySlug, getDraftBySlug, promoteStory } from "@/lib/episodes";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// One page per story per episode: /{slug}/{storyId} is the story's own article
// permalink — the story runs full as the lead, siblings render as teaser cards.
// Draft episodes resolve too (noindex) so links shared from /next survive publish.
// Rendered at request time so publishing is a file sync — no rebuild.
export const dynamic = "force-dynamic";

function resolveEpisode(slug: string): { episode: ReturnType<typeof getBySlug>; isDraft: boolean } {
  const published = getBySlug(undefined, slug);
  if (published) return { episode: published, isDraft: false };
  return { episode: getDraftBySlug(slug), isDraft: true };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; story: string }> }): Promise<Metadata> {
  const { slug, story } = await params;
  const { episode, isDraft } = resolveEpisode(slug);
  const promoted = episode ? promoteStory(episode, story) : null;
  if (!promoted) return {};
  const f = promoted.feature;
  const title = `${f.title} — The South Knoxville Ear`;
  const description = f.deck ?? f.title;
  const image = f.image ?? "/assets/masthead.jpg";
  // Stories rank on their own: self-canonical article permalinks. The feature's own
  // permalink is the episode page's lead story, so it still credits the episode.
  const isFeature = episode!.feature.id === story;
  return {
    title,
    description,
    alternates: { canonical: isFeature ? `/${slug}` : `/${slug}/${story}` },
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
  const { episode } = resolveEpisode(slug);
  const promoted = episode ? promoteStory(episode, story) : null;
  if (!promoted) notFound();
  return <Paper episode={promoted} storyView />;
}
