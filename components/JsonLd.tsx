import type { Edition } from "@/lib/schema";
import { editionJsonLd, jsonLdString } from "@/lib/seo";

export function JsonLd({ edition }: { edition: Edition }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(editionJsonLd(edition)) }}
    />
  );
}
