# The publishing desk

One page for the whole week: every step, every channel, a box for each.
**soknoear.com/desk/&lt;token&gt;** — get the address with `node scripts/pub-status.mjs url`.

## Why it exists

Publishing the Ear is four channels. Claude researches and drafts on Tuesday; Andy says
"run it" on Wednesday; the pipeline drips Instagram posts through Sunday; venue notes have
to reach each venue before its event. Each piece
reported into its own place — a terminal transcript, a recap email, a queue file on the
VPS — and nothing showed the week as a whole. On 2026-09-16 the party email went out
with the previous week's plan; on 2026-09-25 a batch of venue notes was thrown out
because it was built from the wrong episode. Both were visible in a file nobody was
looking at.

## The week

A week runs Monday to Sunday and is keyed by its **Wednesday** — publish day, and the
episode's slug in a normal week.

| Day | What happens | Who |
| --- | --- | --- |
| **Mon** | Weekly Instagram review, 9 AM | Claude (`instagram-review` task) |
| **Tue** | Research · episode draft to /next · audio briefing · party plan rebuilt, 9 AM | Claude (`tuesday-research-draft` task) |
| **Wed** | "run it" · site live · party page live · newsletter and party notice sent for real · Instagram artwork + drip approved · venue notes · publish check at 2 PM | the pipeline (`publish-episode.mjs`) on Andy's "run it", then Claude (`wednesday-publish-check` task) |
| **Wed–Sun** | Instagram posts go out one by one · first-contact venue drafts land in Gmail at 5:30 PM · Claude sends them before each event once Andy has said yes | Pipeline (cron, every 15 min) · Claude (`venue-drafts` task) |

## Nothing waits on Andy

Andy, 2026-09-29: *nothing should be "waiting on Andy" if you are unsure of what you've
built or what has been built; the status can be "AI needs to ask for permission", but that
should be rare.* Every box belongs to Claude or the pipeline. Claude checks its own work
and does the step. It doesn't hand the check to Andy. A task that really does need his yes
carries an `ask`, and it shows at the top of the page under **AI needs to ask for
permission**. Ticking a box there is the yes. There are two such asks today:

- **Publish No. N** (`site-live`, until it's live). Andy's "run it" answers it.
- **Send this week's first notes** (`venue-send`). This is mail from his account to venues
  that haven't heard from the Ear. One yes covers the week.

The newsletter and the party notice aren't asks. They go out for real at the publish.
Preview one only when you're unsure of what you made. Both scripts refuse to mail a list
twice in a week (`RESEND_OK=1` overrides), and `notify-dsparty.mjs` refuses a stale party plan.

## How a box gets ticked

Two kinds of box.

**Evidence.** The pipeline's own files prove the step: the episode JSON exists, the
queue says `posted`. `scripts/pub-status-store.mjs` reads those files on the VPS and
stores a snapshot of the week. It runs at the end of `ig-post.mjs` (the 15-minute cron
tick), at the end of `venue-notify.mjs`, and as the last step of `publish-episode.mjs`.
Evidence boxes have a grey edge on the page and can't be changed there.

**Marks.** Nothing on disk proves the research pass happened or that Andy said yes. Those are recorded — by a script (`notify-subscribers.mjs` and
`notify-dsparty.mjs` mark their own real sends), by Claude
(`node scripts/pub-status.mjs done <task>`), or by Andy clicking the box on the page.

A task is done if the evidence says so **or** someone marked it. A mark never un-does
evidence. An empty box whose day has passed shows a rust **late** flag.

The full list of boxes, and which kind each is, is in
`.claude/skills/publishing-desk/SKILL.md`.

## Where it lives

| Piece | File |
| --- | --- |
| What a week is, and how done it is (pure, tested) | `scripts/pub-status-lib.mjs` |
| Reading the repo, writing the DB | `scripts/pub-status-store.mjs` |
| Command line | `scripts/pub-status.mjs` |
| App-side read + Andy's clicks | `lib/desk.ts`, `app/api/desk/route.ts` |
| The page | `app/desk/[token]/page.tsx`, `components/DeskCheck.tsx` |
| Tests | `tests/pub-status.test.ts`, `tests/desk.test.ts` |

State is three tables in the site's SQLite DB (`/var/lib/soknoear/ear.db`): `pub_weeks`
(one snapshot per week), `pub_marks` (one row per marked box), `pub_meta` (the page's
token).

**Why the DB and not the files.** The running site serves from a release snapshot
under `releases/` and changes into that directory at start. It cannot see
`content/ig-queue/` or `content/venue-notify/`, which live in the repo checkout and
change after every deploy. The DB is the one place both the pipeline and the page reach.

## The address

The page is private by address, the same way `/draft/<token>` is. The token is made the
first time anyone runs `pub-status.mjs url`, and lives in `pub_meta`, not in `.env`.
The page is `noindex` and `/desk/` is disallowed in `robots.txt`. A wrong token gets a
404, as does the API.

To change the address: `sqlite3 /var/lib/soknoear/ear.db "DELETE FROM pub_meta WHERE key='desk_token'"`, then `pub-status.mjs url`.

## Things that will bite

- **Evidence is read from the deployed repo.** A draft committed on the Mac mini but not
  deployed leaves `draft` empty. That is correct: /next doesn't show it either.
- **The heartbeat is the Instagram cron.** If `ig-post.mjs` exits early — it does when
  `content/ig-queue/` doesn't exist at all — the desk only syncs when something else
  calls it. With any queue on disk, it reaches the end.
- **A week with no episode still has a page.** It shows the bare plan with nothing
  ticked, and the episode number it expects.
- **The status page must never break a publish.** Every call from a pipeline script goes
  through `record()` or `syncQuietly()`, which catch everything and print one line.
