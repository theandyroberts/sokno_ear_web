import type { Edition } from "./schema";

const BASE = "https://soknoear.com";
const PUB = "The South Knoxville Ear";

// Build a schema.org JSON-LD @graph for an edition: the publication identity plus
// an Event for every story that carries structured event data (great for Google's
// event rich results on a hyperlocal happenings paper).
export function editionJsonLd(edition: Edition) {
  const stories = [edition.feature, ...edition.stories];
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
        url: `${BASE}/${edition.slug}#${s.id}`,
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
        description: "A weekly events-and-stories paper for South Knoxville, Tennessee.",
      },
      { "@type": "WebSite", name: PUB, url: BASE },
      ...events,
    ],
  };
}

// Serialize safely for embedding in a <script> tag.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
