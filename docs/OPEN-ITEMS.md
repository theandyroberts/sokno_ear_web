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

### 1. Venue outreach — five notes were written for him and none was sent
**Opened:** 2026-08-11 · **Age: 48 days** (as of 2026-09-28) · **Carried through 8 Instagram reviews**
· **Only Andy can do this** · **Push tried 2026-09-28, phone not reached** (Remote Control was inactive on the mini, so it was desktop only; next push only if the Sep 30 drafts also expire unsent)

**2026-09-28, from Andy:** he deleted all five of last week's drafts himself. They did not lapse unread. The first notes go out with this week's drafts (No. 16, in Gmail Wed Sep 30 at 5:30 PM). The Oct 5 review checks `introduced` in `content/contacts.json` before saying anything about this item.

**2026-09-28:** The venue-notes pipeline went live and put five first-contact drafts in Gmail
on Wed Sep 23: Kern's, Earl's, Ijams, Legacy Parks, Puckers (Puckers has no email, so that one
is an Instagram DM). None was sent and all five expired when their events passed. **New drafts
land Wed Sep 30 at 5:30 PM, each with a send-by day on the desk.** Ijams first — the note goes
to Cindy Hassil.

The week it matters to: No. 15 read 4.9 reach per post, the lowest on record, on 14 posts.
Nine of them were Ijams, now 41% of everything posted since Aug 11 (31 posts, 6.9 average
reach, never one like or reshare). Followers went 100 → 101, with no new follower in the
five days Sep 24–28. The pipeline has run two clean weeks; the layout problem it did have
is fixed (A16, in Closed). What's left is that the venues have never heard from the Ear.

**2026-09-21:** Ijams went from 14 tags to 22 in one week (8 of No. 14's 13 posts) and is now
35% of everything posted since Aug 11, at 7.2 average reach, the lowest of any venue. It still
has never engaged. The pipeline ran its first fully clean week and per-post reach is flat at 6–7,
so nothing left in the pipeline addresses this.

Every Instagram review since the baseline has said the same thing: this is the binding
constraint, and it is a conversation, not a pipeline setting. One reshare from Ijams,
Kern's or Puckers reaches more non-followers in an afternoon than the feed has reached
since August.

*To close:* one first-contact note sent. `content/contacts.json` records it as `introduced`,
and from then on that venue's weekly note goes out by itself.

### 2. Search Console is unreadable from the Mac mini
**Opened:** 2026-08-15 · **Age: 44 days** (as of 2026-09-28) · **Missed 2 of 3 SEO checks**
· **Needs Andy**

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
| One venue filled a day of the Instagram drip (No. 15: three Ijams banners Thursday, four Saturday, read 2, 2, 7 and 2, 6, 5, 1) | 2026-09-28 | 2026-09-28 | `placeDaySlots` takes each post's venue: two posts a day per venue, the rest move earlier in the week, never before publish day, nothing dropped; 7 tests in `tests/ig-day-slots.test.ts` (A16). First live week is No. 16 |
| Same-day Instagram posts stacked an hour apart (No. 14's Sunday: 4 Ijams banners 08–11, read 4/5/2/5) | 2026-09-21 | 2026-09-21 | `placeDaySlots` in `ig-schedule.mjs`: ≥2h same-day spacing, collisions walk earlier, overflow to the day before; `tests/ig-day-slots.test.ts` (A15) |
| A12 measure (per-post non-follower reach) can't be read: API rejects `follow_type` on media insights | 2026-09-21 | 2026-09-21 | Measure redefined to per-post reach/views by arm plus account-level non-follower count; A/B continues through No. 16 |
| Post failures / lead-card slot / standing cap: measures confirmed on a live week | 2026-09-15 | 2026-09-21 | No. 14: 13/13 posted, 0 retries, lead cards 13:00, 2 repeats held (A8, A9, A10 closed in the IG review) |
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
