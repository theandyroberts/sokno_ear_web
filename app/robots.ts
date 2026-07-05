import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/next", "/draft/"] },
    sitemap: "https://soknoear.com/sitemap.xml",
    host: "https://soknoear.com",
  };
}
