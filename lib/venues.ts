import fs from "node:fs";
import path from "node:path";

// The venue-logo registry (content/venues.json). Logos are sourced once, from
// the business's own site, and reused everywhere — see the _comment in that
// file for the sourcing rules.

export type Venue = {
  name: string;
  /** Strings a nightlife `venue` field may contain to resolve to this entry. */
  match: string[];
  site?: string;
  /** Public path to the logo, or null when we haven't found a good source. */
  logo: string | null;
  source?: string | null;
  sourceNote?: string | null;
  treatment?: string | null;
  fetched?: string;
  confidence?: string;
  note?: string;
  /** Set (e.g. "2026-08") when the business has closed: kept so archived episodes still
   *  resolve, but never matched against a row's wording, only against an event location. */
  closed?: string;
};

export type VenueRegistry = Record<string, Venue>;

const FILE = path.join(process.cwd(), "content", "venues.json");

export function loadVenues(file: string = FILE): VenueRegistry {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { venues: VenueRegistry };
  return raw.venues;
}

/** Resolve a nightlife `venue` string ("Kern's Food Hall rooftop", "Hi-Wire ·
 *  Barber St") to a registry entry. The venue field carries an address or a
 *  room after the name, so this is a contains-match; the LONGEST matching
 *  alias wins so "SoKno Taco Cantina" beats a hypothetical "SoKno", and
 *  "Angry Dumplings" can't be stolen by a shorter alias elsewhere. */
export function matchVenue(venue: string, registry: VenueRegistry): Venue | null {
  const hay = venue.toLowerCase();
  let best: Venue | null = null;
  let bestLen = 0;
  for (const entry of Object.values(registry)) {
    for (const alias of entry.match) {
      if (alias.length > bestLen && hay.includes(alias.toLowerCase())) {
        best = entry;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

/** The brand name to show on a listing row: the registry's canonical name when
 *  we know the venue, otherwise the part of the venue string before the " · "
 *  address. Used for the wordmark tile and the row's byline. */
export function brandName(venue: string, registry: VenueRegistry): string {
  return matchVenue(venue, registry)?.name ?? venue.split(" · ")[0];
}

/** What a sidebar calendar row needs to draw its venue tile. */
export type CalendarVenue = {
  venue: Venue | null;
  /** The name for the wordmark tile when there is no logo: the registry's name,
   *  else the story's event location, else its label (the location pill). */
  name: string;
};

/** Resolve the venue for a "What's Happening Soon" row from the story it points
 *  at. The story's `event.locationName` is the authority ("Hi-Wire Brewing
 *  Knoxville" → Hi-Wire); failing that, a venue named in the row's title or meta
 *  or the story's title ("Trivia at Trailhead"); failing that, the label, which
 *  for a district or a park is the venue ("Ijams Nature Center", "Kern's").
 *  Rows with no story (older episodes linked out) match on their own text. */
export function calendarVenue(
  row: { title: string; meta?: string },
  story: { title: string; label: string; event?: { locationName: string } } | undefined,
  registry: VenueRegistry,
): CalendarVenue {
  const location = story?.event?.locationName;
  // One text at a time, the row's own title first: it names the place ("… at Earl's"),
  // while a meta or story title that lists the drinks ("$7 mimosas…") would let a longer
  // alias from another venue win the longest-match (the Mimosas tombstone did, 2026-10-26).
  const candidates = [location, row.title, story?.title, row.meta, story?.label];
  // A closed venue (a tombstone kept so archived episodes still resolve) can match an
  // event location, but never a drink or a dish named in a row ("$7 mimosas").
  const open: VenueRegistry = Object.fromEntries(Object.entries(registry).filter(([, v]) => !v.closed));
  let found: CalendarVenue | null = null;
  candidates.forEach((text, i) => {
    if (!text) return;
    const venue = matchVenue(text, i === 0 ? registry : open);
    if (venue && !found) found = { venue, name: venue.name };
  });
  if (found) return found;
  // No registry match: the best plain name we have. A row's meta usually ends in
  // the place ("7 PM · Trailhead"), so take the part after the last " · ".
  const metaPlace = row.meta?.includes(" · ") ? row.meta.split(" · ").pop()?.trim() : undefined;
  return { venue: null, name: location ?? story?.label ?? metaPlace ?? row.title };
}
