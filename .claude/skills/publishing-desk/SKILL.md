---
name: publishing-desk
description: Use whenever you do, finish, or check any step of The South Knoxville Ear's weekly publishing — research, the episode draft, audio, the Dirty South party plan, publishing, the newsletter, the party notice, the Instagram drip, venue notes, the Monday Instagram review — or when Andy asks what's done, what's left, or what's waiting on him. Covers how to read the publishing desk and how to tick its boxes.
---

# The publishing desk

One page shows the whole week: **soknoear.com/desk/<token>**. Get the address with
`node scripts/pub-status.mjs url`. It is private by address — don't paste the token
into commits, docs, or anything public.

The desk has a box for every step of the week, Monday to Sunday, across four channels:
SoKnoEar.com, the Dirty South party page, Instagram, and venue notes. **Your job is to
leave it true.** A box that stays empty after the work is done is a lie Andy will act on.

## Read Andy's answers first

Andy answers the week's **moves** from the Instagram dashboard (Go ahead / Don't / Done /
Not this week, or a note). Before you start any Ear task:

```bash
node scripts/pub-status.mjs moves
```

An answer marked `▶` has not been acted on. If it is in your lane, act on it, then
`node scripts/pub-status.mjs handled <key> "what you did"`. If it isn't, leave it for the
task it belongs to. A move that is Claude's and has a due date is yours to deliver by
that date. Full rules: `docs/IG-DASHBOARD.md`.

## The one command

```bash
node scripts/pub-status.mjs show            # the week, in the terminal
node scripts/pub-status.mjs done <task>     # tick a box
node scripts/pub-status.mjs done <task> --note "what happened"
node scripts/pub-status.mjs note <task> "…" # say something without ticking
node scripts/pub-status.mjs undo <task>     # take a mark back
node scripts/pub-status.mjs sync            # re-read the files now
```

Run it from the repo on the Mac mini or on the VPS — off the VPS it forwards itself over
ssh. `--week YYYY-MM-DD` takes any date in the week you mean (an episode slug works);
without it, the week is today's. `--by` defaults to `claude`.

## Which boxes tick themselves, and which need you

**Evidence boxes tick themselves.** The pipeline's own files prove them, and the desk
re-reads those files every 15 minutes (the Instagram poster's cron tick) and at the end
of every publish. Never mark these; if one is empty, the work isn't done or didn't land.

| Box | Ticks when |
| --- | --- |
| `draft` | `content/drafts/<slug>.json` or `content/episodes/<slug>.json` exists on the VPS |
| `audio` | `public/audio/<slug>.mp3` is deployed |
| `party-plan` | `content/nightlife.json` `weekend` equals the episode's `shortDate` |
| `site-live` | the episode is in `content/episodes/` |
| `party-live` | published, and the party plan matches |
| `ig-art` | images exist in `public/assets/ig/<slug>/` |
| `ig-queue` | the queue is staged **and approved** |
| `ig-post:<id>` | the queue says `posted` (or shows `failed` / dropped) |
| `venue-auto` | every introduced venue in the episode is in the send log |
| `venue-drafts` | every first-contact draft has a Gmail draft id in andy@note15.com |
| `venue-sent:<key>` | the venue's `introduced` date in `content/contacts.json` falls in this week |
| `ig-review` | `docs/ig-reviews/<date>.md` exists for a date in this week |

All of these read the **deployed** repo on the VPS. A file that exists only on the Mac
mini proves nothing — commit, push, and redeploy, then `sync`.

**Mark boxes need someone to say so.** Nothing on disk proves them.

| Box | Who marks it | When |
| --- | --- | --- |
| `research` | you | the Tuesday research pass is finished |
| `review` | Andy (or you, when he sends notes or says "run it") | he has read the draft |
| `newsletter` | `notify-subscribers.mjs` on a real send | a preview only leaves a note |
| `party-notice` | `notify-dsparty.mjs` on a real send | a preview only leaves a note |
| `publish-check` | you | the Wednesday 2 PM check found every channel out, or fixed what wasn't |
| `venue-sent:<key>` | you or Andy | he sent the note some way Gmail can't show — an Instagram DM, a contact form, a phone call |

## The rules

1. **Mark after, never before.** Tick a box when the step has finished and you have seen
   it work, not when you start it.
2. **Put the number in the note.** "sent 7 of 7", "No. 16, feature + 4 stories",
   "3 channels out, newsletter still preview". A bare tick tells Andy nothing.
3. **A failure is a note, not a tick.** If a step failed or was skipped, leave the box
   empty and `note` why. The desk turns an empty box past its day into a rust "late" flag;
   that is the correct picture.
4. **Finish with `show`.** At the end of any publishing task, run `show` and include the
   "Waiting on Andy" list in your message to him, soonest deadline first. Venue notes carry
   a send-by day — say it.
5. **Never tick `site-live`, the newsletter, or the party notice by hand to make the page
   look finished.** Publishing and the real sends are Andy's call; the boxes follow the act.

## When a box looks wrong

- Empty but the work is done → is it deployed? `ssh andy@143.244.188.235 'cd /var/www/soknoear && git log -1 --oneline'`, then `node scripts/pub-status.mjs sync`.
- Stale "last synced" on the page → the Instagram cron isn't reaching its end. Check `/home/andy/logs/ig-post.log`.
- Ticked but wrong → `undo <task>` removes a mark. Evidence can't be un-ticked; fix the file it reads.

More detail, including how the page is built: `docs/PUBLISHING-DESK.md`.
