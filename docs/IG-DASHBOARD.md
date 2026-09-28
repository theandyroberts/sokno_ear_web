# The Instagram dashboard

**note15.com/insta/soknoear** — what Andy looks at on Monday to see how @soknoear is
doing. The long analysis is `docs/ig-reviews/<date>.md`; this page is the picture.

## What Andy asked for (2026-09-28)

After nine runs written by hand he called the page "more like reading a book than a
dashboard". His six points, which are now the rules:

1. **Glanceable.** How the account is doing against last week and against the start,
   readable in seconds.
2. **Show the posts.** The Instagram images themselves, for what worked and what didn't.
3. **The picture is on top.** Numbers, lines, dials, images. Not a list of what he owes.
4. **He answers on the page.** He never copies a suggestion into a chat to move it along.
5. **Plain names.** "Venue outreach", "Two posts a day per venue". Never "A11", "A16".
6. **Claude decides.** You are the Instagram expert. Make the call, do it, tell him what
   you decided and leave him a way to say no.

## How a run gets onto the page

Nothing is written by hand. `scripts/ig-dashboard.mjs` draws the run from a data file
and refuses a data file that breaks the rules.

```bash
# 1. write docs/ig-reviews/data/<date>.json  (copy last week's and change the numbers)
# 2. make thumbnails for every post it shows, 600px on the long side
sips -Z 600 -s formatOptions 72 public/assets/ig/<slug>/<id>.jpg --out <tmp>/<slug>_<id>.jpg
scp <tmp>/*.jpg andy@143.244.188.235:/var/www/note15/insta/img/soknoear/
# 3. draw it into a copy of the live page
scp andy@143.244.188.235:/var/www/note15/insta/soknoear.html <tmp>/page.html
node scripts/ig-dashboard.mjs docs/ig-reviews/data/<date>.json --into <tmp>/page.html
# 4. look at it (headless Chrome screenshot), then put it back, commit and push
scp <tmp>/page.html andy@143.244.188.235:/var/www/note15/insta/soknoear.html
ssh andy@143.244.188.235 'cd /var/www/note15 && git add insta && git -c user.name="theandyroberts" -c user.email="theandyroberts@note15.com" commit -m "insta/soknoear: run NN" && git push'
```

`--into` puts the new run on top and showing, adds it to the rail, hides every other
run, and refreshes the page's styles and script. Running it twice changes nothing.
Runs 01–08 stay as they were written; they are the archive.

## The data file

| Field | What it is | Limit |
| --- | --- | --- |
| `headline` | The week in one line | 12 words |
| `verdicts` | Two to four coloured pills: label, `tone` (`ok` / `warn` / `bad`), a few words | 8 words each |
| `tiles` | Three to six numbers, each with its `series` (the line), `vsLast` and `vsBase` | |
| `week` | Every post of the week, in order, each with `img` and `reach`; `group` colours it | every post has an image |
| `worked`, `didnt` | One to three posts each, with `img`, `reach` and a reason | 16 words a reason |
| `learned` | One set of bars: the thing the numbers show | |
| `dials` | Half-circle gauges | |
| `bestEver` | The account's best posts, as images | |
| `moves` | **One to three.** `key`, `title`, `owner` (`claude` / `andy`), `why`, `plan` | 28 words a reason |
| `done` | What you already did this week | 24 words each |
| `writeUp` | Optional path to HTML for a collapsed "full write-up". Leave it out; the markdown is the write-up. | |

`validate()` also refuses any lettered ticket ("A11") anywhere in the file.

## Moves, and Andy's answers

A move is one thing that should change. It is **Claude's** ("going ahead on Wednesday
unless you say no") or **Andy's** ("only you can do this"). Each has a plain slug for a
key and lives in the Ear's database, so his answer outlasts the page.

```bash
node scripts/pub-status.mjs moves                 # what's open, and what he said — READ FIRST
node scripts/pub-status.mjs move <key> --title "…" --owner claude|andy --plan "…" --due YYYY-MM-DD
node scripts/pub-status.mjs handled <key> "what you did about his answer"
node scripts/pub-status.mjs close <key> "why it's finished"
```

- The page shows **Go ahead / Don't** on Claude's moves and **Done / Not this week** on
  Andy's, plus a line for a note. A note on its own counts as an answer.
- An answer shows on the page as "waiting for the next run" until a run marks it
  `handled`, then as "acted on". **Every scheduled Ear task reads `moves` before it
  starts** and acts on any answer in its lane.
- A move in the data file must exist in the database (`move …`) or its card says
  "This one is finished."
- The buttons only appear when the page has the desk key. Andy gets that by opening the
  dashboard from the link on his publishing desk; the key rides in the URL fragment,
  the page moves it to `localStorage` and strips it from the address. Never put the key
  in the page, a commit or a doc. `node scripts/pub-status.mjs url --insta` prints the
  keyed address if he needs it again.
- Some answers are wired straight into the pipeline. `weekend-roundup` answered "Don't"
  makes `ig-queue.mjs` build the week the old way, with no run in between.

## Where it lives

| Piece | File |
| --- | --- |
| Drawing, rules, the page's styles and script | `scripts/ig-dashboard.mjs` |
| The run's numbers | `docs/ig-reviews/data/<date>.json` |
| Moves: schema and rules | `scripts/pub-status-lib.mjs` (`desk_moves`) |
| Andy's answers from the page | `app/api/desk/moves/route.ts` (cross-origin from note15.com only) |
| Tests | `tests/ig-dashboard.test.ts`, `tests/desk-moves.test.ts` |
| The page and its images | `/var/www/note15/insta/soknoear.html`, `/var/www/note15/insta/img/soknoear/` |
