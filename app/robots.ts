import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // /stats is the first-party Umami proxy (components/Analytics.tsx). Only
    // /stats/script.js and /stats/api/send exist; Googlebot found the script and
    // then probed the bare directory, which 404s. Disallowing the prefix keeps
    // that out of the Page indexing report without touching collection.
    rules: { userAgent: "*", allow: "/", disallow: ["/next", "/draft/", "/stats"] },
    sitemap: "https://soknoear.com/sitemap.xml",
    host: "https://soknoear.com",
  };
}
