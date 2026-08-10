import type { Episode } from "@/lib/schema";
import { episodeJsonLd, storyJsonLd, jsonLdString } from "@/lib/seo";

/** Episode pages emit the publication + event graph; story permalinks (storyUrl set)
 *  emit a NewsArticle for the promoted story instead. */
export function JsonLd({ episode, storyUrl }: { episode: Episode; storyUrl?: string }) {
  const data = storyUrl ? storyJsonLd(episode, storyUrl) : episodeJsonLd(episode);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
