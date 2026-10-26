# Venue logos — the sidebar calendar's inventory

The "What's Happening Soon" rows carry a small tile with the venue's own mark where
the date stamp used to be (the date moved up into the black day bar, 2026-10-26).
The tile comes from `content/venues.json`; a venue with `logo: null` gets its name set
as a wordmark on the same tile, so a missing file is never a hole.

A row finds its venue through the story it links to (`lib/venues.ts` →
`calendarVenue`): the story's `event.locationName` first, then a venue named in the
row's title/meta or the story's title, then the story's label. Longest alias wins,
so "Old Sevier Market" beats "Old Sevier" and "Kern's Food Hall rooftop" still lands
on Kern's. Never add a bare "Sevier" alias.

Sourcing rules are the registry's own (`_comment` in `content/venues.json`): the mark
comes from the business's own site or official profile, `source` records exactly
where, and the file is trimmed and scaled into `public/assets/venues/` (sharp, then
`scripts/optimize-image.sh`). Treatments: `as-is`, `ink-recolor` (white-on-dark art
repainted brand ink), `cropped`.

Counts are calendar rows across `content/episodes/*.json` and `content/drafts/*.json`
whose `#story-id` resolves to a story (Nos. 6–20 plus the No. 21 draft, 2026-10-26).
The first five episodes' rows carried no `href`, so they match on their own text.

| Venue / location | Calendar rows | Logo file | Source |
|---|---|---|---|
| Ijams Nature Center (incl. River Landing, Mead's Quarry, Nature Playscape, Visitor Center, Miller Education Building, Homesite, banding station, plaza, river access) | 80 | `ijams-nature-center.png` | ijams.org header, `Ijams-Logo-2023.png` (Wix static) |
| Kern's / Kern's Food Hall / rooftop (+ label) | 20 | `kerns.png` | already registered |
| Suttree Landing (label) | 16 | none yet — wordmark | City of Knoxville park; no mark of its own, knoxvilletn.gov blocks fetches (403) |
| Hi-Wire Brewing Knoxville | 12 | `hi-wire.svg` | already registered |
| Trailhead Beer Market | 10 | `trailhead.png` | already registered |
| Earl's | 10 | `earls.png` | already registered |
| Fly by Night | 8 | `fly-by-night.svg` | already registered |
| The 808 | 7 | `the-808.png` | already registered |
| The Pink Cactus | 7 | `the-pink-cactus.svg` | already registered |
| Borderland Playhouse / Borderland Tees | 7 | none yet — wordmark | borderlandtees.com has no logo image (text header, photo og:image, stage photo on /playhouse; Facebook picture is a photo) |
| Puckers Sports Grill (+ "Knoxville") | 6 | `puckers.png` | already registered |
| Printshop Beer Co. | 4 | `printshop.png` | already registered |
| Old Sevier District (+ label "Old Sevier" when no venue is named) | 3 (+3 label-only) | `old-sevier-district.png` | oldsevierdistrict.org header logo (Squarespace CDN, 380px, the largest they publish) |
| Urban Wilderness (label) + Urban Wilderness Gateway Park | 5 | `legacy-parks.png` | legacyparks.org header, `LegacyParksLogoHoriz.png` — Legacy Parks assembled the Urban Wilderness |
| Baker Creek Preserve | 2 | `legacy-parks.png` | Legacy Parks owns the preserve (same file) |
| SoKno (label) | 3 | none — wordmark "SoKno" | not a venue |
| City County Building — Main Assembly Room | 1 | none — wordmark | civic room, no mark sought |
| Mimosas | 1 | none (tombstone) | closed Aug 2026 |
| Augusta Quarry at Fort Dickerson Park | 1 | none — wordmark | City park |
| South Knoxville | 1 | none — wordmark | not a venue |
| Neyland Stadium | 1 | none — wordmark | off the beat |
| Marble Springs State Historic Site | 1 | `marble-springs.png` | marblesprings.net header, `MS_logo_knoxtenn.jpg` (Wix static); white JPEG ground knocked out |
| Alliance Brewing | 1 | `alliance-brewing.png` | already registered |
| Old Sevier Market | 1 | `old-sevier-market.png` | the market's Facebook page picture (720px); oldseviermarket.com has no logo file |
| ScruffyCat and ScrappyKitty start (race) | 1 | none — wordmark | a race, not a venue |
| SoKno Rail Trail and Art Walk, River's Edge Apartments | 1 | none — wordmark | not a venue |

Registered ahead of their first calendar row (they appear in story text, facts and
the nightlife plan, and Andy named them): 

| Venue | Logo file | Source |
|---|---|---|
| Mighty Mud | `mighty-mud.png` | mightymud.com media library, `Mighty-Mud-hi-res.png` (2500px) |
| SoKno Sourdough | `sokno-sourdough.png` | soknosourdough.com, the site's declared logo file `logo_circle_green_*.png` |
| Redbud Kitchen | `redbud-kitchen.png` | redbudkitchen.com header, `RK_Logo_Final_Color.png` |
| Honeybee Coffee | `honeybee-coffee.png` | honeybeecoffeeco.com, `16.9 Logo.png` — white on transparent, repainted ink |
| Knoxville Theatre Club | `knoxville-theatre-club.png` | knoxvilletheatreclub.org header logo (the red stamp roundel) |
| AMBC (Appalachian Mountain Bike Club) | `ambc.png` | ambcknox.org banner `bg-ambc-logo.png`, cropped to the chainring; navy field kept (white lettering inside) |
| Sevier Ave Burger Co. | none yet — wordmark | Instagram only; no website resolves, no Facebook page under the handle |

## Not found / left as wordmark

- **Borderland Playhouse** — no logo anywhere on their site or profiles (see above).
- **Suttree Landing Park** — a City park; the City seal would be the wrong mark.
- **Sevier Ave Burger Co.** — Instagram only; Andy can save the profile picture into
  `public/assets/venues/sevier-ave-burger.png` and set `logo`/`source` on the entry.

## Adding one

1. Find the mark on the business's own site: the header `<img>`, an inline `<svg>`,
   the WordPress/Squarespace media file it points at; og:image only as a last resort.
2. Trim, scale to ~400px on the long edge, PNG (or keep the SVG). White-on-dark art
   gets `ink-recolor`; a tagline or another town's name gets `cropped`.
3. Add the entry: `name`, `match` aliases (every spelling the stories use; check the
   longest-alias rule against the existing list), `site`, `logo`, `source`,
   `sourceNote`, `treatment`, `fetched`, `confidence`.
4. `npx vitest run tests/venues.test.tsx tests/calendar-item.test.tsx` — the registry
   test checks every logo path ships and every entry records its source.
