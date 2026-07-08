import type { MetadataRoute } from "next";
import { loadEditions } from "@/lib/editions";

export const dynamic = "force-dynamic";

const BASE = "https://soknoear.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const editions = loadEditions();
  return [
    { url: BASE, lastModified: editions[0]?.date, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/archive`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/about`, changeFrequency: "yearly", priority: 0.4 },
    ...editions.map((e) => ({
      url: `${BASE}/${e.slug}`,
      lastModified: e.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
