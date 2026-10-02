// Read one Instagram profile's recent posts, with full captions, from the built-in browser.
//
// Instagram shows a logged-out visitor a profile's last 12 posts and each post's full
// caption (in the post page's og:title). curl gets neither: it is served the login shell.
// So the weekly research pass reads venues' feeds here, in the Browser pane.
//
// How to run it, once per handle in content/sources.json:
//   1. navigate to https://www.instagram.com/<handle>/
//   2. javascript_tool → paste this file's contents, then:  await igScan({ since: "2026-09-22" })
//
// It returns { handle, bio, seen, posts: [{ href, date, cap, img }] }. `cap` is the caption;
// `img` is Instagram's own description of the picture, which carries the text of a flyer
// when the caption only says "swipe" or "see graphic". A post by another account that
// tagged the venue shows up too, with that account in `href`: those are how a band's
// own announcement of a show at the venue gets found.
//
// seen: 0 means the profile did not render. Breweries that age-gate their account
// (Hi-Wire) do this to logged-out visitors; they need a signed-in session or another source.
// Pace it: one profile at a time, the built-in ~1s between posts. Don't loop it faster.

window.igScan = async ({ since, capLen = 900 } = {}) => {
  const sel = 'a[href*="/p/"], a[href*="/reel/"]';
  for (let i = 0; i < 12 && !document.querySelector(sel); i++) await new Promise((r) => setTimeout(r, 1000));
  await new Promise((r) => setTimeout(r, 1500));
  const cutoff = since ? new Date(since) : new Date(Date.now() - 14 * 86400000);
  const links = [...document.querySelectorAll(sel)].map((a) => ({
    href: a.getAttribute("href"),
    alt: a.querySelector("img")?.alt || "",
  }));
  const posts = [];
  for (const a of links) {
    const m = a.alt.match(/on ([A-Z][a-z]+ \d{1,2}, \d{4})/);
    if (m && new Date(m[1]) < cutoff) continue; // pinned posts sit first, so filter by date, not position
    try {
      const html = await (await fetch(a.href, { credentials: "omit" })).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const og = doc.querySelector("meta[property='og:title']")?.content || "";
      posts.push({
        href: a.href,
        date: m ? m[1] : "?",
        cap: og.replace(/^.*? on Instagram: /, "").slice(0, capLen),
        img: a.alt.replace(/^.*?\d{4}\.\s*/, "").slice(0, 420),
      });
    } catch (e) {
      posts.push({ href: a.href, err: String(e) });
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  return {
    handle: location.pathname,
    bio: (document.querySelector("header")?.innerText || "").replace(/\n/g, " | ").slice(0, 400),
    seen: links.length,
    posts,
  };
};
