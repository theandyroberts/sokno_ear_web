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

### 1. Venue outreach — nobody has ever talked to the venues
**Opened:** 2026-08-11 · **Age: 35 days** · **Carried through 6 Instagram reviews**
· **Only Andy can do this**

Nine venues tagged across 79 posts. Zero reshares, ever. Non-follower reach over the
last three 28-day windows: 10 → 10 → 6, while the follower list grew 16% then 10%.
Ijams alone is 14 tags since Aug 11 — a quarter of everything posted, at 7.8 average
reach, the worst of any venue — and has never engaged once.

Every Instagram review since the baseline has said the same thing: this is the binding
constraint, and it is a conversation, not a pipeline setting. One reshare from Ijams,
Kern's or Puckers reaches more non-followers in an afternoon than the feed has reached
since August. **Ijams is the door to knock on** — not because it performs, but because
a quarter of the coverage already goes there and the relationship is entirely one-way.

Six reviews of pipeline tuning have now run inside a 95-follower base. The pipeline is
in good shape. This is what is left.

### 2. Search Console is unreadable from the Mac mini
**Opened:** 2026-08-15 · **Age: 31 days** · **Missed 2 of 3 SEO checks**
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
| `www.soknoear.com` served the whole site with no redirect | 2026-09-01 | 2026-09-15 | Apex-only serving block + redirect-only 443 block for www + port-80 hop to the literal apex. `dad9825` |
| Instagram posts failed silently and permanently (2 lost) | 2026-09-15 | 2026-09-15 | `ig-post.mjs`: in-run publish retry on transients, `failed` made non-terminal with a 4-tick budget, `notify.mjs` on exhaustion, dated posts dropped rather than published hours late |
| Standing-item cap reset on a retitle | 2026-09-15 | 2026-09-15 | Cap counts by `social.standingKey ?? id`; `social.standing` marks an item standing from run one; 20 archive stories keyed |
| Lead cards took the 17:00 cell on a late publish | 2026-09-15 | 2026-09-15 | `nextLeadWindow` aims the pair at the next 09:00–13:00 window, clamped so it never pushes the stories it introduces |
| `user_tags` A/B never ran | 2026-09-07 | 2026-09-15 | Deterministic 50/50 split in `ig-queue.mjs`, `user_tags` on container creation in `ig-post.mjs`, captions held identical |
| 77 story pages had one inbound link each | 2026-09-15 | 2026-09-15 | `/archive` links every story title instead of printing it as text |
| `/stats` 404 noise in Page indexing | 2026-09-01 | 2026-09-15 | `Disallow: /stats` in `app/robots.ts` |
| Repo nginx config had drifted from live | 2026-09-15 | 2026-09-15 | `deploy/soknoear.com.nginx` re-synced |
