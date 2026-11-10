import { describe, expect, it } from "vitest";
import { loadEpisodes, promoteStory } from "@/lib/episodes";
import { EpisodeSchema, type Story } from "@/lib/schema";
import { episodeJsonLd, storyJsonLd, jsonLdString } from "@/lib/seo";

function episodeWith(overrides: Partial<Story> = {}) {
  return EpisodeSchema.parse({
    slug: "2026-11-11", volume: 1, number: 22, episode: "Weekend Episode",
    date: "2026-11-11", place: "South Knoxville, TN",
    feature: {
      id: "show", label: "Music", title: "A show at The 808",
      deck: "A touring band plays Friday night.",
      body: [{ type: "paragraph", text: "Doors at seven, show at eight." }],
      event: { startDate: "2026-11-13T20:00:00-05:00", locationName: "The 808" },
      ...overrides,
    },
    scanner: [{ label: "Music", image: "/assets/masthead.jpg", title: "A show", blurb: "Friday", href: "#show" }],
    stories: [], sidebar: { calendar: [] },
  });
}

function descriptions(overrides: Partial<Story> = {}) {
  const episode = episodeWith(overrides);
  return [
    episodeJsonLd(episode),
    storyJsonLd(episode, `https://soknoear.com/${episode.slug}/show`),
  ].flatMap((data) => data["@graph"].filter((node) => node["@type"] === "Event").map((node) => node.description));
}

describe("Event descriptions", () => {
  it("preserves an existing deck in episode and story markup", () => {
    expect(descriptions()).toEqual(Array(2).fill("A touring band plays Friday night."));
  });

  it.each([undefined, "", " \n\t "])("uses the article paragraph when the deck is %j", (deck) => {
    expect(descriptions({ deck })).toEqual(Array(2).fill("Doors at seven, show at eight."));
  });

  it("uses visible rich-text runs without markup, URLs, or extra word breaks", () => {
    expect(descriptions({ deck: undefined, body: [
      { type: "subhead", text: "Friday" },
      { type: "paragraph", text: "Hidden alternative", runs: [
        { text: "Big ", bold: true }, { text: "Something", href: "https://example.com" },
        { text: " plays\nFriday." },
      ] },
    ] })).toEqual(Array(2).fill("Big Something plays Friday."));
  });

  it("skips empty rendered paragraphs and uses the next one", () => {
    expect(descriptions({ deck: undefined, body: [
      { type: "paragraph", text: " \n " },
      { type: "paragraph", text: "This text is not rendered", runs: [] },
      { type: "paragraph", runs: [{ text: "  Doors at seven.  " }] },
    ] })).toEqual(Array(2).fill("Doors at seven."));
  });

  it("falls back to the factual story title when there is no paragraph", () => {
    expect(descriptions({ deck: undefined, body: [
      { type: "agenda", rows: [{ time: "8 PM", what: "Show" }] },
    ] })).toEqual(Array(2).fill("A show at The 808"));
  });

  it("does not invent an Event for stories without event details", () => {
    expect(descriptions({ event: undefined })).toEqual([]);
  });

  it("keeps description text safe inside an inline JSON-LD script", () => {
    const data = episodeJsonLd(episodeWith({ deck: undefined, body: [
      { type: "paragraph", text: 'A "show" </script><script>alert(1)</script>' },
    ] }));
    const serialized = jsonLdString(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });

  it("covers every published Event on episode pages and story permalinks", () => {
    const episodes = loadEpisodes();
    expect(episodes.length).toBeGreaterThan(0);
    let checked = 0;
    for (const episode of episodes) {
      const stories = [episode.feature, ...episode.stories].filter((story) => story.event);
      const events = episodeJsonLd(episode)["@graph"].filter((node) => node["@type"] === "Event");
      expect(events).toHaveLength(stories.length);
      stories.forEach((story, index) => {
        const promoted = promoteStory(episode, story.id)!;
        const storyEvent = storyJsonLd(promoted, `https://soknoear.com/${episode.slug}/${story.id}`)
          ["@graph"].find((node) => node["@type"] === "Event");
        const description = events[index].description;
        expect(typeof description, `${episode.slug}/${story.id}`).toBe("string");
        expect(description!.trim().length, `${episode.slug}/${story.id}`).toBeGreaterThan(0);
        expect(storyEvent?.description).toBe(description);
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });
});
