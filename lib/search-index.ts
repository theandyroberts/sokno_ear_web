import { loadEpisodes } from "./episodes";
import { loadVenues } from "./venues";
import { buildIndex, type SearchIndex } from "./search";

/** The live index: published episodes only (content/episodes), never the drafts. */
export function getSearchIndex(): SearchIndex {
  return buildIndex(loadEpisodes(), loadVenues());
}
