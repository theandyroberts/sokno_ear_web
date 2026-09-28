import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // DO NOT add /stats here. It was added 2026-09-15 to silence a harmless 404 on
    // the bare directory, and it backfired within two weeks: `Disallow` is a PREFIX
    // match, so /stats also blocked /stats/script.js — the first-party Umami tracker
    // that components/Analytics.tsx loads on every page. Google mailed a "New reason
    // preventing your pages from being indexed: Blocked by robots.txt" alert, because
    // a blocked render resource on 100% of the site is exactly what that warns about.
    //
    // The 404 it was hiding is genuinely harmless — Googlebot found /stats/script.js,
    // probed /stats, got a 404, and that is the end of it. A 404 ages out of the index
    // on its own; a robots-blocked URL sits in the report indefinitely and can even be
    // indexed with no content if something links to it. The 404 is the better state.
    //
    // A narrow `/stats$` would spare the script (Google honours `$`), but it still
    // trades a self-healing 404 for a permanent "Blocked by robots.txt" row — the same
    // alert category, for no gain. Leave /stats alone.
    rules: { userAgent: "*", allow: "/", disallow: ["/next", "/draft/", "/desk/"] },
    sitemap: "https://soknoear.com/sitemap.xml",
    host: "https://soknoear.com",
  };
}
