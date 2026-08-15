# SEO log — soknoear.com

Biweekly health check (1st and 15th). Newest entry first.

Each entry records the site-side audit numbers and, when Search Console is
reachable, the Page indexing + Performance figures. Deltas are vs. the previous
entry.

---

## 2026-08-15 — baseline

First logged entry, so no deltas. Everything below is the starting line.

### Site-side audit

| Check | Result |
| --- | --- |
| `sitemap.xml` | 200, 9,333 bytes, **60 URLs** |
| Sitemap composition | 3 static (`/`, `/archive`, `/about`) + 9 episodes + 48 story permalinks |
| Spot-check 5 sitemap URLs | `/archive`, `/2026-07-16/disco-chicken`, `/2026-06-20/fireflies`, `/2026-07-09/bird-banding`, `/2026-08-13/mimosas-puckers` → all 200 |
| `robots.txt` | Unchanged — `Allow: /`, `Disallow: /next`, `Disallow: /draft/`, `Host:`, `Sitemap:` |
| Canonical — homepage | `https://soknoear.com` ✓ |
| Canonical — latest episode `/2026-08-13` | `https://soknoear.com` ✓ (deliberate; kills the weekly homepage twin) |
| Canonical — older episode `/2026-07-16` | self ✓ |
| Canonical — non-feature story `/2026-07-16/disco-chicken` | self ✓ |
| Canonical — feature permalink `/2026-08-13/hummingbird-weekend` | `/2026-08-13` ✓ (credits the episode) |
| Canonical — `/about`, `/archive` | self ✓ |
| `NewsArticle` JSON-LD on story pages | Present ✓ (also `Event`, `Place`, `PublicationIssue`, `ImageObject`, `NewsMediaOrganization`) |
| Noindex audit | Only `/next` (currently a 404 — no draft pending) and `/draft/*`. All episode, story, archive, about, and home pages are `index, follow` ✓ |

Feature permalinks are intentionally absent from the sitemap (they canonicalize
to their episode page) — 48 story URLs for 9 episodes reflects that.

### Search Console

**Not collected.** No Chrome browser connected to this machine and the Browser
pane has no Google session, so `sc-domain:soknoear.com` bounced to the signed-out
marketing page. The GSC half of this check needs Andy to open Search Console.

### Copy violations found and fixed

Auditing indexed metadata surfaced live uses of the word "paper" (the Ear is
never a paper) and "issue" (weekly releases are episodes):

| File | Was | Now |
| --- | --- | --- |
| `app/layout.tsx:11` | "South Knoxville's weekly **paper** —" | "weekly **roundup** —" |
| `app/about/page.tsx:10` | "a free weekly **paper** of events… a future **issue**" | "a free weekly **roundup**… a future **episode**" |
| `app/about/page.tsx:68` | "is a free weekly **paper** for one stretch" | "is free, weekly, and made for one stretch" |
| `app/about/page.tsx:79` | "for a future **issue**" | "for a future **episode**" |
| `app/about/page.tsx:116` | "supervises every **issue** from the couch" | "every **episode** from the couch" |
| `lib/story-drafter.ts:130` | "a weekly neighborhood **paper**" (LLM system prompt) | "a weekly neighborhood **roundup**" |

`/about` was the only indexed page serving the wrong wording in its meta
description and visible body copy. The `layout.tsx` string is the site-wide
fallback description — every real page overrides it, so its only live surface was
the (noindexed) 404. The `story-drafter.ts` line was seeding the wrong framing
into every AI-drafted story.

Remaining `paper` hits are in `components/ds/*.d.ts` doc comments and three source
comments (`app/page.tsx:5`, `app/[slug]/page.tsx:6`, `lib/seo.ts:8`) — code
comments, not content, left alone.

Verification: `npx tsc --noEmit` clean, `npm test` 51/51 passing. **Not yet
deployed** — needs `deploy/redeploy.sh` to reach production.
