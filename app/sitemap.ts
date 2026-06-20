import type { MetadataRoute } from "next";
import { loadEditions } from "@/lib/editions";

const BASE = "https://soknoear.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const editions = loadEditions();
  return [
    { url: BASE, lastModified: editions[0]?.date, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/archive`, changeFrequency: "weekly", priority: 0.5 },
    ...editions.map((e) => ({
      url: `${BASE}/${e.slug}`,
      lastModified: e.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
