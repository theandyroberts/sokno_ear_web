# Open items

One ledger for everything the recurring checks have found and not yet closed.

**Why this file exists.** On 2026-09-01 the SEO check found `www.soknoear.com`
serving a duplicate of the whole site. It reported it exactly as designed — into a
terminal transcript — and nobody saw it. Two weeks later the next run found the same
thing and reported it the same way. Andy learned about it by noticing a warning
triangle. A finding that lives only in a report nobody opens is not a finding.

**The rule.** Every recurring check reads this file first and writes it last.

- An item gets an **Opened** date and never loses it. Age is the escalation signal.
- A check **alerts Andy, every run until it is fixed,** when something is broken, when
  something it is meant to read **could not be reached** (Search Console, the VPS, a
  signed-out browser), or when it needs a decision or login only Andy has. A check
  that did half its job did not work. (Andy, 2026-11-14, after Search Console sat
  unread for 91 days filed as "not blocking".)
- Alerts go out on both channels: `scripts/notify.mjs` on the VPS (email + text) and
  `PushNotification`. The log entry records which channels landed.
- A check that finds everything working sends **nothing**. A channel that fires on
  healthy runs gets ignored.
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
**Opened:** 2026-10-26 · **Age: 14 days** (as of 2026-11-09) · **Claude's** · **Move:** `early-posts` · **Decision: Mon 2026-11-23**

Andy, Oct 23: every dated post went out about three hours before doors, so the venue and
the act never had time to reshare, and the reshare is the account's reach (13 shared posts
in three weeks average 148; the other 32 tagged posts average 22). `assignTimingArms` in
`scripts/ig-schedule.mjs` (`9c5ec6a`) splits each week's dated posts within each venue: half
go exactly 24 hours before their old slot, half stay day-of, the split flips each week, and
`timingArm` is stored on the post. Andy answered "go" Oct 30.

**2026-11-09:** age 14 days, week two read. Early 5 posts, 2 shared (Bow Wow Bingo 108, goat
yoga 26); day-of 6 posts, 2 shared (Sourdough 170, Latin.Knox 85). Cumulative: early 3 of 12
(25%), median 28; day-of 4 of 13 (31%), median 25. Within one share; no call. Week three runs
with `flip` false. Table in `docs/ig-reviews/2026-11-09.md`.

**2026-11-02:** age 7 days. Week one (No. 20): early 7 posts, 1 shared, median 21; day-of 7
posts, 2 shared, median 18. Too close to call. Table in `docs/ig-reviews/2026-11-02.md`.

*Measures, every Monday:* posts, shared (≥1 share), share rate, median and mean reach, profile
visits by arm, this week and cumulative. *Decide:* at the review of Nov 23, or sooner if one
arm leads two-to-one on shares with at least 20 posts in each; then the winner becomes the
rule in `assignTimingArms` and the move closes.

### 2. The roundup's slides carry the venue tag — first week Wed Nov 11, read it Nov 16
**Opened:** 2026-11-09 · **Claude's** · **Move:** `roundup-slide-tags` · **Due: Wed 2026-11-11**

The weekend roundup read 260 on Nov 3 (14, 32, 81, 41, 100, 260), the account's fifth-best
post ever, with two shares and a save and nothing tagged in any of its ten slides. Every
single banner has carried its venue as an in-image tag since Oct 7 and the tagged posts are
the ones venues find and share. This run: `buildRoundup` returns `slideTags` aligned with
`slides` (cover untagged), `publishPost` sends each slide's `user_tags` on its own child
container, `dropRefusedTags` strips a 2207018 handle from slides as well as single images,
and `roundupSlideTagsOn(moves)` honours Andy's "Don't". Tests in `tests/ig-roundup.test.ts`
and `tests/ig-untaggable.test.ts`.

*Measures:* the No. 22 roundup publishes first time (a refused handle shows as a `✂` retry,
not a failure); its reach and shares against 260 and 2. *Close:* after two roundups with
tagged slides, whatever they read; this is a correction, not a test.

### 3. Say hello to SoKno Sourdough
**Opened:** 2026-11-09 · **Andy's** (a DM from the account) · **Move:** `sourdough-hello` · **Due: Wed 2026-11-11**

The bakery's first Ear post (First Friday with Peter Riesing and Paradise Chocolate, Nov 6)
read 170 with three shares, 13 profile visits and a follow, from the image tag alone; the
Ear has never written to them. No email anywhere (`soknosourdough.com` renders empty), so
the first contact is a DM, which only Andy can send. `content/contacts.json` has
`sokno-sourdough` with `introduced: null`; the move carries the DM text (under 900
characters, one link, asks for their social person's email).

*To close:* Andy marks it Done; the next run sets `introduced` and the weekly note runs from
`venue-notify` like everyone else's. An email in the reply goes in `email`/`to`.

### 4. Text alerts are off
**Opened:** 2026-11-14 · **Needs Andy** · alerting — email sent 2026-11-14

`scripts/notify.mjs` can text from the Ear's AgentPhone line, but `/var/www/soknoear/.env`
has `AGENTPHONE_API_KEY` empty and no `ALERT_SMS_TO`, so no alert has ever gone out as a
text. Email works (test landed 2026-11-14), and `PushNotification` reaches the phone only
while Remote Control is on. *To close:* an AgentPhone API key and Andy's mobile number in
that `.env`; then send a test with `node --env-file=.env scripts/notify.mjs`.

---

## Closed

| Item | Opened | Closed | What fixed it |
| --- | --- | --- | --- |
| Search Console unreadable from the Mac mini (missed 5 of 6 SEO checks) | 2026-08-15 | 2026-11-14 | The pane was opening the property as andy@sparkpoint.studio; it belongs to the note15 account. The task now opens it with `authuser=andy%40note15.com`, and read it in full on 2026-11-14 (187 indexed, 46 waiting on Google, was 64 of 80). The bigger failure was filing it as "not blocking" for 91 days: an unreachable source now alerts every run (rule above) |
| SEO alerts never sent | 2026-11-14 | 2026-11-14 | The task ran `notify.mjs` without loading `.env`, so every channel reported "skipped". It now runs `node --env-file=.env`; test email landed |
| Every post went out an hour early after the clocks went back (Nov 1 – Nov 7: eight dated posts a day, the feature, the Reel), because the scheduler wrote every slot with a constant `-04:00` | 2026-11-09 | 2026-11-09 | `etIso`/`toIso` in `scripts/ig-schedule.mjs` take the offset from the calendar (`America/New_York`); `scripts/ig-queue.mjs` uses them in all eight places; four tests in `tests/ig-schedule.test.ts` pin Oct 29 to `-04:00` and Nov 5 to `-05:00`. First live week is No. 22. Lesson below |
| The weekly Reel comes out (decided Nov 2) | 2026-10-26 | 2026-11-03 | Withdrawn by Andy on Nov 3: he wants a Reel every week. `reelIsOn` is back on; cut with `/brag-slim`, 24 s, voiced by SouthernCourtney. No. 21's read 17 reach, 8.2 s watched (34%, the best share yet) |
| The weekly Reel: three cuts (116 s, 46 s, 46 s opening on the feature) read 27, 19 and 16, under the week's median still every time; the third was watched 7.5 s and skipped 73% | 2026-10-26 | 2026-11-02 | The Reel comes out from Nov 4: `reelIsOn` in `scripts/ig-reel.mjs` is off unless Andy answers "Don't" on `reel-comes-out`; `publish-episode.mjs` skips the render, `ig-queue.mjs` the post. `reel-opens-on-the-story` closed with the numbers |
| Stale worktree under `.claude/worktrees/` failed the full `vitest run` (38 React tests resolving a different `node_modules`) | 2026-10-26 | 2026-11-02 | `vitest.config.ts` excludes `.claude/**`; 44 files, 425 tests, all passing |
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

**2026-11-09 — a status line that prints the plan is not a check.** The publishing desk said
"4:00 PM" for a post Instagram put up at 3:00 PM, because the desk prints the slot string and
the slot string carried a summer-time offset after the clocks went back. Eight posts a day for
a week went out an hour early and nothing in the pipeline noticed; the Monday review found it
by reading Instagram's own timestamps against the queue. Two rules:

1. **Never hard-code a UTC offset for a place.** `-04:00` is a season, not a time zone. Build
   the string from `America/New_York` for that date (`etIso` in `scripts/ig-schedule.mjs`).
2. **A check compares the thing that happened with the thing that was meant.** The publish
   check should read one posted timestamp from the API and compare it with the slot; printing
   the slot back is not evidence.


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
