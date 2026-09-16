# SEO log — soknoear.com

Biweekly health check (1st and 15th). Newest entry first.

Each entry records the site-side audit numbers and, when Search Console is
reachable, the Page indexing + Performance figures. Deltas are vs. the previous
entry.

---

## 2026-09-15

Third check. Deltas vs. 2026-09-01. Site-side half is clean and complete;
**Search Console was not reachable** this run (see below), so there are no GSC
deltas — the 2026-09-01 figures remain the latest ones on record.

### Site-side audit

| Check | Result | Delta |
| --- | --- | --- |
| `sitemap.xml` | 200, 14,661 bytes, **94 URLs** | +14 URLs (+2,208 bytes) |
| Sitemap composition | 4 static + 13 episodes + 77 story permalinks | static unchanged, **+2 episodes** (`/2026-09-02`, `/2026-09-09`), **+12 stories** |
| `lastmod` range | 2026-06-20 → 2026-09-09 | tracks the latest published episode ✓ |
| Full sweep of all 94 sitemap URLs | **94/94 return 200**, **94/94 `index, follow`**, **94/94 carry a canonical** | — |
| Spot-check 5 random URLs | `/2026-07-02/sunday-yoga`, `/2026-08-13/kerns-allplay`, `/2026-08-06/ijams-weekend`, `/2026-09-02/trailhead-trivia`, `/2026-06-26` → all 200 | — |
| `robots.txt` | Unchanged — `Allow: /`, `Disallow: /next`, `Disallow: /draft/`, `Host:`, `Sitemap:` | — |
| Canonical — homepage | `https://soknoear.com` | ✓ |
| Canonical — latest episode `/2026-09-09` | `https://soknoear.com` (deliberate) | ✓ |
| Canonical — older episodes (12 of them) | self, all 12 | ✓ |
| Canonical — non-feature stories | self, **all 77** (sweep, not spot-check) | ✓ |
| Canonical — feature permalink `/2026-09-09/twilight-ijams` | `/2026-09-09`, and correctly absent from the sitemap | ✓ |
| Canonical — `/about`, `/archive`, `/dirtysouthparty` | self | ✓ |
| `NewsArticle` JSON-LD | Present on **all 77** story pages (sweep) | ✓ |
| Noindex audit | `/next` is **200 + `noindex, nofollow`** (No. 14 draft is pending — it was a 404 last check because nothing was queued); `/draft/*` 404 + `noindex`. Nothing in the sitemap is noindexed | ✓ |
| Banned-copy check (`paper`/`newspaper`/`issue`/`edition`) in visible copy | Clean on `/`, `/about`, `/archive`, `/dirtysouthparty`, `/2026-09-09` | ✓ |
| `www.soknoear.com` → apex | Was still 200 with no redirect at audit time; **fixed and deployed the same day** — now 301 → apex in one hop | ✓ **fixed** |
| `/stats` | Still 404 (cosmetic; no `Disallow` added) | unchanged |

### Search Console

**Not collected.** `list_connected_browsers` returns empty (no Chrome extension
connected to this machine right now), and the Browser pane has no Google session —
`sc-domain:soknoear.com` bounced to the signed-out marketing page, same as at
baseline. The GSC half of this check needs Andy to open Search Console, or to
have Chrome running with the extension connected at run time.

### Findings

**1. `www.soknoear.com` served 200 with no redirect — FIXED this run.**
Reported on 2026-09-01 and still unfixed at audit time, two weeks later. The live
config had `server_name soknoear.com www.soknoear.com;` on the single serving
block, and certbot's port-80 hop redirected to `https://$host`, which preserves
whatever hostname the visitor typed — so www was a second live copy of the whole
site and nothing ever collapsed it onto the apex.

Fixed by adopting the pattern `christinadavilaproperties.com` already uses on the
same box: the serving block claims the apex only, a second redirect-only 443 block
claims `www` and returns `301 https://soknoear.com$request_uri`, and the port-80
block redirects to the literal apex instead of `$host`. The cert already covers
both names, so the www block terminates TLS cleanly before redirecting.

Verified after reload:

| Request | Result |
| --- | --- |
| `https://www.soknoear.com/` | 301 → `https://soknoear.com/` |
| `https://www.soknoear.com/archive` (the URL Google canonicalized to www) | 301 → `https://soknoear.com/archive` |
| `http://www.soknoear.com/2026-09-09` | 301 → `https://soknoear.com/2026-09-09` |
| `http://soknoear.com/about` | 301 → `https://soknoear.com/about` |
| Full redirect chain from www | **1 hop**, path preserved, final 200 |
| Apex `/`, `/about`, `/archive`, `/dirtysouthparty`, latest episode, a story | all still 200 |
| `/stats/script.js`, `/stats/api/send`, six `_next` chunks | all still serving |
| `scripts/healthcheck.sh` on the VPS | exit 0 |

Expect the GSC "Alternate page with proper canonical tag" bucket (14 rows, 12 of
them www variants) to drain over the next few crawls, and
`www.soknoear.com/archive` to be replaced by the apex as the indexed URL.

**1b. The repo's copy of the nginx config was badly stale.** `deploy/soknoear.com.nginx`
was missing the `/stats` Umami location blocks, the `deny-sensitive` include, and
the entire 443 block — it described a server that hasn't existed since August.
Re-synced from live in the same commit. (`/etc/nginx/sites-available/soknoear.com`
is also stale on the box — an older fleet-wide `sub_filter` variant — but nginx
includes `sites-enabled/*` only, so it is inert. Left alone.)

**2. Growth is healthy and the pipeline is clean.** +14 URLs in two weeks (~7/week,
slightly ahead of the ~5/week expectation) with zero regressions across 94 pages:
every status, canonical, robots directive, and `NewsArticle` block is correct.
No new structural issue appeared.

**3. Crawl demand is still the open question.** The 64 never-crawled URLs from
2026-09-01 cannot be re-measured without GSC, and the sitemap has grown by 14 more
pages since — the uncrawled tail has almost certainly grown, not shrunk. This is
the one number worth getting eyes on.

### Actions

**Done this run:**

1. **www → apex redirect shipped.** Live config rewritten and `systemctl reload nginx`;
   backup at `/root/soknoear.com.nginx.bak-2026-09-15`. Verified above.
2. **`deploy/soknoear.com.nginx` re-synced from live**, so the repo copy is
   documentation again rather than fiction.

3. **Story links added to `/archive`.** `/archive` printed every story title as
   plain text, so all 77 story permalinks had exactly ONE inbound internal link —
   their own episode page. Nothing linked them from a hub. This is a better
   explanation for the 64 never-crawled URLs than the "crawl demand" reading in the
   2026-09-01 entry, and it is the cheapest thing on the list: the titles were
   already on the page. Live: **0 → 73 story links** (the 77 in the sitemap minus
   the current episode, which is not in "past episodes" yet), 12 episode links
   intact, spot-checked links resolve 200.
4. **`Disallow: /stats`** added to `app/robots.ts`, retiring the 404 that Googlebot
   has been carrying in Page indexing. Umami collection is untouched —
   `/stats/script.js` and `/stats/api/send` both still serve.
5. **`redeploy.sh` build detection fixed.** Running `git pull` by hand before
   `redeploy.sh` made OLD == NEW, so a diff full of `app/` changes deployed with
   `build=false` — the release flipped, every check passed, and the site kept
   serving the old code. Caught today, on these very changes. The baseline now
   comes from the `current` symlink (release dirs are named `<timestamp>-<sha>`),
   so it is right regardless of who pulled.
6. **Open items now have one home:** `docs/OPEN-ITEMS.md`, with an Opened date per
   item so age is the escalation signal.

**Open, needs Andy:**

7. **Alerting.** This finding sat unread for two weeks because "message Andy" in the
   task file means printing to a terminal transcript. Andy's note: email is not the
   answer either — 100+ unread on a normal day. A channel and a volume rule are still
   to be decided; the standing requirement is that a *blocking* finding reaches him
   within a day, and that a carried finding restates its age every run.
8. **Search Console access**, so the crawl numbers can be read at all. Two fixes
   that should move the never-crawled count shipped today and neither can be
   measured without it.

---

## 2026-09-01

Second check. Deltas vs. 2026-08-15. **Search Console was reachable this time**
(it was not at baseline), so this is the first entry with real GSC numbers —
treat them as the new baseline for that half.

### Site-side audit

| Check | Result | Delta |
| --- | --- | --- |
| `sitemap.xml` | 200, 12,453 bytes, **80 URLs** | +20 URLs (+3,120 bytes) |
| Sitemap composition | 4 static + 11 episodes + 65 story permalinks | +1 static (`/dirtysouthparty`), +2 episodes, +17 stories |
| Full sweep of all 80 sitemap URLs | **80/80 return 200**, **80/80 `index, follow`** | — |
| Spot-check 5 random URLs | `/2026-07-09/shakespeare-preview`, `/2026-08-06`, `/2026-07-23/earls`, `/2026-08-13`, `/2026-08-06/ijams-weekend` → all 200 | — |
| `robots.txt` | Unchanged — `Allow: /`, `Disallow: /next`, `Disallow: /draft/`, `Host:`, `Sitemap:` | — |
| Canonical — homepage | `https://soknoear.com` | ✓ |
| Canonical — latest episode `/2026-08-26` | `https://soknoear.com` (deliberate) | ✓ |
| Canonical — older episode `/2026-07-16` | self | ✓ |
| Canonical — non-feature story `/2026-08-26/goat-yoga` | self | ✓ |
| Canonical — feature permalink `/2026-08-26/lunar-eclipse` | `/2026-08-26` | ✓ |
| Canonical — `/about`, `/archive`, `/dirtysouthparty` | self | ✓ |
| `NewsArticle` JSON-LD | Present on **all 65** story pages (sweep, not spot-check) | ✓ |
| Noindex audit | Only `/next` (404, noindex) and `/draft/*` (404, noindex). Nothing in the sitemap is noindexed | ✓ |
| Banned-copy check (`paper`/`newspaper`/`issue`/`edition`) in visible prod copy | Clean on `/`, `/about`, `/archive`, `/2026-08-26` — the Aug-15 fixes are live | ✓ deployed |

The 277 `paper` hits in the homepage HTML are all CSS custom properties
(`--paper-cream`, `--paper-edge`, `--paper-shadow`) — design-system names, not copy.

### Search Console (`sc-domain:soknoear.com`, data through 8/27–8/30)

**Sitemap:** submitted Jun 20, last read **Aug 30**, status Success, 80 discovered
pages. Discovery is working; crawling is not.

**Page indexing — 15 indexed / 85 not indexed, 6 reasons:**

| Reason | Pages | Read |
| --- | --- | --- |
| Discovered - currently not indexed | **64** | **The problem.** All 64 show *Last crawled: N/A* — never fetched once. Goes back to `/2026-06-20/*`, i.e. 10+ weeks. |
| Alternate page with proper canonical tag | 14 | Expected noise: 12 `www.` variants + 2 feature permalinks (`/2026-07-16/shakespeare`, `/2026-07-09/hiwire-sunday`). |
| Crawled - currently not indexed | 3 | A `_next` `.woff2` font, `/2026-07-23`, the junk www favicon. |
| Page with redirect | 2 (+1) | `http://soknoear.com/`, `http://www.soknoear.com/` — expected. Also lists `/stats`. |
| Not found (404) | 1 | `/stats` — the Umami analytics proxy path (`components/Analytics.tsx:18`). Googlebot found `/stats/script.js` and probed the bare directory. Harmless. |
| Duplicate, Google chose different canonical than user | 1 | `/archive` — Google indexed `www.soknoear.com/archive` instead. See the www finding below. |

**Indexed 15:** 8 episode pages, 4 story pages, `/`, `/about`, and
`www.soknoear.com/archive`. `www.soknoear.com/2026-07-23/mimosas` is also indexed
under the alternate-canonical bucket's host.

**Performance (Jun 19 – Aug 29):** 4 clicks, 205 impressions, 2% CTR, avg
position 9.4. Only 10 queries have data, all with 0 clicks:

| Query | Impressions |
| --- | --- |
| ijams shakespeare | 9 |
| knoxville shakespeare in the park | 5 |
| shakespeare at ijams | 2 |
| sokno | 2 |
| so know / sokno pride parking / shakespeare knoxville / hoedown south / singo knoxville / ijams glass room | 1 each |

Every query with impressions is an *event* query (Shakespeare at Ijams), not a
brand query. Brand search for "sokno ear" does not register yet.

### Findings

**1. `www.soknoear.com` is a live duplicate host — no redirect to apex.**
`deploy/soknoear.com.nginx:6` puts `soknoear.com` and `www.soknoear.com` in one
`server_name`, and nothing redirects. `https://www.soknoear.com/` returns **200**,
not 301. (`http://` → `https://` works; the www→apex hop is what is missing.)
Self-referential apex canonicals absorb most of it — that is exactly what the 14
"Alternate page with proper canonical tag" rows are — but Google has still
indexed two URLs on the www host and picked www over apex for `/archive`.

**2. 64 of 80 sitemap URLs have never been crawled.** Not a technical block —
robots, canonicals, status codes, and JSON-LD are all correct, and the sitemap is
re-read every few days. It is crawl demand: a ~10-week-old domain with 4 total
clicks and no external links has almost no crawl budget, and story permalinks are
the low-priority tail. Episode pages index; individual stories mostly do not.

**3. `/stats` 404.** Cosmetic. `Disallow: /stats` in `robots.txt` would silence it.

### Actions

Nothing was changed or deployed in this check — it was audit-only.

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
