import type { Episode } from "@/lib/schema";
import { episodeJsonLd, jsonLdString } from "@/lib/seo";

export function JsonLd({ episode }: { episode: Episode }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(episodeJsonLd(episode)) }}
    />
  );
}
