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
