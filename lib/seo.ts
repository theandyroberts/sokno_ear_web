import type { Episode } from "./schema";

const BASE = "https://soknoear.com";
const PUB = "The South Knoxville Ear";

// Build a schema.org JSON-LD @graph for an episode: the publication identity plus
// an Event for every story that carries structured event data (great for Google's
// event rich results on a hyperlocal happenings paper).
export function episodeJsonLd(episode: Episode) {
  const stories = [episode.feature, ...episode.stories];
  const events = stories.flatMap((s) => {
    if (!s.event) return [];
    return [
      {
        "@type": "Event",
        name: s.title,
        startDate: s.event.startDate,
        ...(s.event.endDate ? { endDate: s.event.endDate } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: s.event.locationName,
          ...(s.event.locationAddress
            ? {
                address: {
                  "@type": "PostalAddress",
                  streetAddress: s.event.locationAddress,
                  addressLocality: "Knoxville",
                  addressRegion: "TN",
                  addressCountry: "US",
                },
              }
            : {}),
        },
        ...(s.deck ? { description: s.deck } : {}),
        ...(s.image ? { image: [`${BASE}${s.image}`] } : {}),
        url: `${BASE}/${episode.slug}#${s.id}`,
      },
    ];
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        name: PUB,
        url: BASE,
        logo: `${BASE}/assets/masthead.jpg`,
        description: "A weekly events-and-stories read for South Knoxville, Tennessee.",
      },
      { "@type": "WebSite", name: PUB, url: BASE },
      ...events,
    ],
  };
}

// JSON-LD for a story permalink: the story as a NewsArticle (plus its Event, if any).
// `episode` is the promoted episode — its feature IS the story this page is about.
export function storyJsonLd(episode: Episode, storyUrl: string) {
  const s = episode.feature;
  const image = `${BASE}${s.image ?? "/assets/masthead.jpg"}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        headline: s.title,
        ...(s.deck ? { description: s.deck } : {}),
        image: [image],
        datePublished: episode.date,
        author: { "@type": "Organization", name: PUB, url: BASE },
        publisher: {
          "@type": "NewsMediaOrganization",
          name: PUB,
          url: BASE,
          logo: { "@type": "ImageObject", url: `${BASE}/assets/masthead.jpg` },
        },
        mainEntityOfPage: storyUrl,
        url: storyUrl,
        isPartOf: { "@type": "PublicationIssue", name: `Vol. ${episode.volume} — No. ${episode.number}`, url: `${BASE}/${episode.slug}` },
      },
      ...(s.event
        ? [
            {
              "@type": "Event",
              name: s.title,
              startDate: s.event.startDate,
              ...(s.event.endDate ? { endDate: s.event.endDate } : {}),
              eventStatus: "https://schema.org/EventScheduled",
              eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
              location: {
                "@type": "Place",
                name: s.event.locationName,
                ...(s.event.locationAddress
                  ? {
                      address: {
                        "@type": "PostalAddress",
                        streetAddress: s.event.locationAddress,
                        addressLocality: "Knoxville",
                        addressRegion: "TN",
                        addressCountry: "US",
                      },
                    }
                  : {}),
              },
              ...(s.deck ? { description: s.deck } : {}),
              ...(s.image ? { image: [image] } : {}),
              url: storyUrl,
            },
          ]
        : []),
    ],
  };
}

// Serialize safely for embedding in a <script> tag.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
