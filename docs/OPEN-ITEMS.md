# Open items

One ledger for everything the recurring checks have found and not yet closed.

**Why this file exists.** On 2026-09-01 the SEO check found `www.soknoear.com`
serving a duplicate of the whole site. It reported it exactly as designed — into a
terminal transcript — and nobody saw it. Two weeks later the next run found the same
thing and reported it the same way. Andy learned about it by noticing a warning
triangle. A finding that lives only in a report nobody opens is not a finding.

**The rule.** Every recurring check reads this file first and writes it last.

- An item gets an **Opened** date and never loses it. Age is the escalation signal.
- A check **pushes a notification only for BLOCKING items** — something is broken,
  or something needs a decision only Andy can make. Everything else lands here quietly.
- Ages **7** and **14** days re-fire the notification for an item already open. That
  is the escalation that did not happen for the www redirect.
- A check that finds nothing blocking sends **nothing**. A channel that fires every
  run is a channel that gets ignored, which is how this started.
- **Close items here.** An item that is fixed moves to Closed with what fixed it.

**Channels.** `scripts/notify.mjs` fans out to whatever is configured — Resend email,
and SMS from the Ear's own AgentPhone line when `ALERT_SMS_TO` is set on the VPS.
Checks running on the Mac mini use `PushNotification` (desktop + phone). Email alone
is not sufficient: Andy runs 100+ unread on a normal day.

---

## Open

**Names, not numbers.** Items are called what they are ("Venue outreach"). The lettered
tickets the Instagram reviews used until 2026-09-28 (A1–A16) meant nothing to Andy and are
retired; where an old one appears below, its name is beside it. Things Andy can answer are
**moves** on the dashboard (`node scripts/pub-status.mjs moves`).

### 1. Half the posts go out a day early (the timing test) — first week Wed Oct 28, read it Nov 2
**Opened:** 2026-10-26 · **Claude's** · **Move:** `early-posts` · **Due: Wed 2026-10-28**

Andy, Oct 23: every dated post went out about three hours before doors, so the venue and
the act never had time to reshare, and the reshare is the account's reach (13 shared posts
in three weeks average 148; the other 32 tagged posts average 22). `assignTimingArms` in
`scripts/ig-schedule.mjs` (`9c5ec6a`) splits each week's dated posts within each venue: half
go exactly 24 hours before their old slot, half stay day-of, the split flips each week, and
`timingArm` is stored on the post. This run registered the move and added `earlyPostsOn(moves)`
so a "Don't" on the dashboard puts every post back to day-of. No post has run in either arm
yet. Recipe and the empty arm table in `docs/ig-reviews/2026-10-26.md`.

*Measures, every Monday:* posts, shared (≥1 share), share rate, median and mean reach, profile
visits by arm, this week and cumulative. *Decide:* at the review of Nov 23, or sooner if one
arm leads two-to-one on shares with at least 20 posts in each; then the winner becomes the
rule in `assignTimingArms` and the move closes.

### 2. The Reel opens on the feature, not the title card — first cut Wed Oct 28, read it Nov 2
**Opened:** 2026-10-26 · **Claude's** · **Move:** `reel-opens-on-the-story` · **Due: Wed 2026-10-28**

Two Reels: 116 s read 19 (11.8 s watched, 68% skipped), 46 s read 16 (11.1 s watched, 44%
skipped). The cut fixed completion, not reach, and the viewer left at eleven seconds both
times — the cover card and the counting intro. Shipped this run: `cut_order` and `bridge_text`
in `scripts/ig-reel.py` play the feature's quip first and the title card second as the bridge
("Five more of the sixteen things … all of them at soknoear.com"); `--title-first` is the old
order, which `publish-episode.mjs` passes when Andy answers "Don't" (`reelOpensOnStory`).

*Measures, Nov 2:* reach against 16 and against the week's median still post (21 this week);
average watch above 15 s; skip rate under 44%. *If reach is still under the median still,* the
Reel comes out on Nov 2 (`weekly-reel` closed with the numbers) — this is its last structural
fix.

### 3. Stale worktree fails the full test run
**Opened:** 2026-10-26 · **Claude's** · not blocking — no push

`npx vitest run` at the repo root picks up `.claude/worktrees/keen-colden-4ab029/tests/` and
38 of its React tests fail (`Cannot read properties of null (reading 'useState')` — the
worktree resolves a different `node_modules`). They fail identically with and without this
run's changes; the repo's own `tests/` are 69 files, 679 tests, all passing. Not removed here
because a worktree is somebody's working copy. *To close:* delete the worktree once whatever
it holds is merged, or exclude `.claude/worktrees/**` in `vitest.config`.

### 4. Search Console is unreadable from the Mac mini
**Opened:** 2026-08-15 · **Age: 61 days** (as of 2026-10-15) · **Missed 4 of 5 SEO checks**
· **Needs Andy** · not blocking — no push (the site-side half covers breakage; this only costs the crawl numbers)

**2026-10-15:** missed again (4 of 5) — no Chrome extension connected, Browser pane
signed out. Sitemap is 174 URLs (+39 since 2026-10-01); site-side sweep all clean.

**2026-10-01:** missed again — no Chrome extension connected, Browser pane signed out.
Sitemap is now 135 URLs (+41 since 2026-09-15), so the uncrawled-share question has
grown, not shrunk.

No Chrome extension connected to the mini, and the Browser pane has no Google session,
so `sc-domain:soknoear.com` bounces to the signed-out page. The 2026-09-01 run got in
and is the only real data on record.

This blocks the one number worth watching: **64 of the then-80 sitemap URLs had never
been crawled** (all showing *Last crawled: N/A*). The sitemap is 94 URLs now. Two fixes
shipped 2026-09-15 that should move it — the www consolidation and story links on
`/archive` — and neither can be measured without this.

*To close:* leave Chrome running with the Claude extension connected when the check
fires (1st and 15th), or open Search Console and paste the Page indexing numbers.

---

## Closed

| Item | Opened | Closed | What fixed it |
| --- | --- | --- | --- |
| Tag the artist in the picture too (the code ran Oct 12 and tagged nobody; the draft gate from Oct 19) | 2026-10-12 | 2026-10-26 | The gate worked first time: all 16 No. 19 stories carried `igAct` (8 handles, 8 reasons there is none); 7 posts tagged an act beside the venue and 3 of the 7 were shared (116, 71, 36) against 2 of the 10 venue-only posts. The gate stays; `docs/ig-reviews/2026-10-26.md` |
| The Reel is cut to 45 seconds | 2026-10-19 | 2026-10-26 | Posted Oct 21 at 45.8 s and read Oct 26: 16 reach, 11.1 s watched (24%, was 10%), skip rate 43.8% (was 68.4%). The cap stays at 45; the opening is the next fix (open item 2) |
| The Call-the-Ear ad, held while the phone line changes (was a move and an open item) | 2026-10-12 | 2026-10-19 | Not an open item: Andy decided it once (Oct 9) and said so again Oct 19 when the review asked. `AD_HELD = true` in `scripts/ig-container.mjs` keeps the ad out of every staging until he says turn it back on; the move is closed; no review asks about it |
| The first Reel goes out Wednesday (built Oct 12, recut Oct 13 as a quip a story) | 2026-09-28 | 2026-10-19 | Posted Oct 14 at 1 PM with No. 18 through the REELS container path, first time, no retry. Read Oct 19: 19 reach, 11.8 s watched of 116, 68% skipped — the cut was too long, so it is 45 s from Oct 21 (item 1 above); `docs/ig-reviews/2026-10-19.md` |
| Fewer posts reached fewer people — the roundup week (47 reach on 8 posts, 1 non-follower) and its fixes | 2026-10-05 | 2026-10-12 | Every story back to a single post and every venue post tagged in the image, both live Oct 7. No. 17: 17 posts, 926 reach, lowest 9, 660 non-followers, 14 of 14 tagged, the roundup read 14 (needed 6 — it stays). Every measure cleared; `docs/ig-reviews/2026-10-12.md` |
| **Venue outreach**: the venues had never heard from the Ear (carried through 9 Instagram reviews, 48 days at the last) | 2026-08-11 | 2026-10-03 | Andy sent the five first notes himself: Legacy Parks Sep 29, Earl's, Ijams and Kern's Oct 1, Puckers Oct 3 (Instagram DM). `content/contacts.json` records each as `introduced`; `scripts/venue-notify.mjs` sends their weekly note itself from the No. 17 publish. Still to come: the first reshare |
| The image-tag test (`user_tags`, 50/50 by story id, Sep 16 – Oct 4) | 2026-09-07 | 2026-10-05 | Decided: tagged 9.0 against untagged 6.6 reach a post over three weeks, ahead every week; every venue post is now tagged in the image (`userTagsFor`). The split is kept behind Andy's "Don't" |
| A venue's folded stories went out as one carousel of their own ("3 more at Ijams Park", read 4 for three stories) | 2026-09-28 | 2026-10-05 | `venueCarouselsOn` is off: every story keeps its single post; the two-posts-a-day venue cap already stops the stacking the fold was for. The weekend roundup itself stays (item 2 above) |
| The carousel publish path had only run against a fake Instagram | 2026-09-28 | 2026-09-30 | No. 16: both carousels published as carousels, 10+1 and 3+1 containers, no `downgradedFrom`; publish check and the Oct 5 review confirm |
| The equal-age reading said age ≥2 was within 6% of final | 2026-09-28 | 2026-10-05 | It wasn't: No. 15 grew 35% after age 2–5, No. 14 another 15% after age 8. Revised in `docs/ig-reviews/2026-10-05.md`: expect +30–35% from age 2–5, +10–15% from age 8 |
| Instagram banners were a wall of teal (9 of 12 in No. 15): the band took the place's pill colour, and the place was Ijams Park | 2026-09-28 | 2026-09-28 | `band_colors` in `scripts/ig-banners.py`: a place keeps its colour for its first story of the week, the rest take the least-used palette colour; `social.igBand` overrides; `tests/ig-band-colors.test.ts` |
| Artwork drew the whole scene (the quarry, the class, the lawn) where the best-read posts are one object up close | 2026-09-28 | 2026-09-28 | "One subject, close in" in `.claude/skills/sokno-ear-art/SKILL.md`, and the Tuesday draft task now loads that skill before drawing. First used on No. 16; the Oct 5 review compares |
| One venue filled a day of the Instagram drip (No. 15: three Ijams banners Thursday, four Saturday, read 2, 2, 7 and 2, 6, 5, 1) | 2026-09-28 | 2026-09-28 | `placeDaySlots` takes each post's venue: two posts a day per venue, the rest move earlier in the week, never before publish day, nothing dropped; 7 tests in `tests/ig-day-slots.test.ts` (two posts a day per venue). First live week is No. 16 |
| Same-day Instagram posts stacked an hour apart (No. 14's Sunday: 4 Ijams banners 08–11, read 4/5/2/5) | 2026-09-21 | 2026-09-21 | `placeDaySlots` in `ig-schedule.mjs`: ≥2h same-day spacing, collisions walk earlier, overflow to the day before; `tests/ig-day-slots.test.ts` (same-day spacing) |
| The image tag test's measure (per-post non-follower reach) can't be read: API rejects `follow_type` on media insights | 2026-09-21 | 2026-09-21 | Measure redefined to per-post reach/views by arm plus account-level non-follower count; A/B continues through No. 16 |
| Post failures / lead-card slot / standing cap: measures confirmed on a live week | 2026-09-15 | 2026-09-21 | No. 14: 13/13 posted, 0 retries, lead cards 13:00, 2 repeats held (retry-and-alert, lead-card aiming and the standing cap, closed in the IG review) |
| `www.soknoear.com` served the whole site with no redirect | 2026-09-01 | 2026-09-15 | Apex-only serving block + redirect-only 443 block for www + port-80 hop to the literal apex. `dad9825` |
| Instagram posts failed silently and permanently (2 lost) | 2026-09-15 | 2026-09-15 | `ig-post.mjs`: in-run publish retry on transients, `failed` made non-terminal with a 4-tick budget, `notify.mjs` on exhaustion, dated posts dropped rather than published hours late |
| Standing-item cap reset on a retitle | 2026-09-15 | 2026-09-15 | Cap counts by `social.standingKey ?? id`; `social.standing` marks an item standing from run one; 20 archive stories keyed |
| Lead cards took the 17:00 cell on a late publish | 2026-09-15 | 2026-09-15 | `nextLeadWindow` aims the pair at the next 09:00–13:00 window, clamped so it never pushes the stories it introduces |
| `user_tags` A/B never ran | 2026-09-07 | 2026-09-15 | Deterministic 50/50 split in `ig-queue.mjs`, `user_tags` on container creation in `ig-post.mjs`, captions held identical |
| 77 story pages had one inbound link each | 2026-09-15 | 2026-09-15 | `/archive` links every story title instead of printing it as text |
| `/stats` 404 noise in Page indexing | 2026-09-01 | 2026-09-28 | **Reverted, not fixed.** The 2026-09-15 `Disallow: /stats` prefix-matched `/stats/script.js` and blocked the Umami tracker on every page; Google mailed a "Blocked by robots.txt" alert on 2026-09-28. The 404 was the better state and is back. See the lesson below |
| Repo nginx config had drifted from live | 2026-09-15 | 2026-09-15 | `deploy/soknoear.com.nginx` re-synced |

---

## Lessons

**2026-09-28 — don't silence cosmetic noise with robots.txt.** The `/stats` 404 was
logged as "Harmless" on 2026-09-01 and then "fixed" anyway on 2026-09-15. `Disallow`
is a prefix match, so the fix blocked `/stats/script.js` — the analytics tracker on
100% of pages — and produced a louder problem than the one it removed, thirteen days
later, by email, to Andy.

Two rules out of it:

1. **A `Disallow` path blocks everything beneath it.** Before adding one, list what
   actually serves under that prefix. `curl` each path.
2. **Noise that a check has already called harmless does not need fixing.** A 404
   ages out on its own. A robots block does not — it stays in the report indefinitely
   and can be indexed with no content. Removing a report row is not a goal; the
   report is an instrument, not the thing being optimised.
