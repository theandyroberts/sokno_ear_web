import type { MetadataRoute } from "next";
import { loadEpisodes } from "@/lib/episodes";

export const dynamic = "force-dynamic";

const BASE = "https://soknoear.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const episodes = loadEpisodes();
  return [
    { url: BASE, lastModified: episodes[0]?.date, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/archive`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/about`, changeFrequency: "yearly", priority: 0.4 },
    ...episodes.map((e) => ({
      url: `${BASE}/${e.slug}`,
      lastModified: e.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
