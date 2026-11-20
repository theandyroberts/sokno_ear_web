import fs from "node:fs";
import path from "node:path";
import localFont from "next/font/local";
import { pickDefaultDay, isSponsorDay } from "@/lib/nightlife";
import { DirtySouth } from "@/components/DirtySouth";
import { CAT_LABEL, PLAN_CATS, freshPlan, lineup, parsePlanParams, planQuery, type PlanState } from "@/lib/planner";
import { loadPlanner } from "@/lib/planner-data";
import type { Metadata } from "next";

// The flyer's landing page: soknoear.com/dirtysouthparty (QR codes add ?src=…
// for attribution — same page). Day tabs default to tonight, Thu–Sun.
export const dynamic = "force-dynamic";

const SITE = "https://soknoear.com";
const TITLE = "Dirty South Party Planner — South Knoxville Nightlife, Night by Night";
const DESCRIPTION =
  "South Knoxville nightlife tonight: happy hours, dinner, live music, karaoke, and the late hang across Old Sevier, the South Waterfront, and the Urban Wilderness — pick a place to eat, a place to drink and something to do, and send the game plan to your crew. The Dirty South party planner from The South Knoxville Ear.";
const DAY_NAMES = { Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" } as const;

type Params = Record<string, string | string[] | undefined>;

/** The page's own preview, or — for a link that carries a game plan — a preview of
 *  that plan: its picture, "The Friday game plan in the Dirty South", and the picks.
 *  That's what Messages, WhatsApp and Android show when the link is pasted or shared
 *  (Andy, 2026-11-20: the generic header told people nothing). */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const base: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/dirtysouthparty" },
    openGraph: {
      title: TITLE, description: DESCRIPTION, type: "website",
      url: `${SITE}/dirtysouthparty`,
      siteName: "The South Knoxville Ear", images: ["/assets/masthead.jpg"],
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  };
  const { planner } = loadPlanner();
  const parsed = freshPlan(parsePlanParams(await searchParams), planner);
  if (!parsed.picks || !parsed.day) return base;
  const state: PlanState = { day: parsed.day, picks: parsed.picks, types: parsed.types ?? PLAN_CATS };
  const plan = lineup(planner, state);
  if (!plan.length) return base;
  const query = planQuery(state, planner.week);
  const title = `The ${DAY_NAMES[state.day]} game plan in the Dirty South`;
  const description = plan
    .map(({ cat, option }) => `${CAT_LABEL[cat]}: ${option.time ? `${option.time}, ` : ""}${option.kind === "venue" ? option.title : option.brand}`)
    .join(" · ");
  const image = { url: `${SITE}/dirtysouthparty/plan-image?${query}`, width: 1200, height: 630, alt: `${title}: ${description}` };
  return {
    ...base,
    title,
    description,
    // The plan link itself, not the bare page — some apps re-fetch og:url and would lose the picks.
    openGraph: { ...base.openGraph, title, description, url: `${SITE}/dirtysouthparty?${query}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

const anton = localFont({ src: "./Anton-Regular.woff2", display: "swap" });

// The territory map link appears as soon as the image lands in public/assets.
// The optimized .jpg is preferred; the .png is Andy's full-quality source.
function findMap(): string | null {
  for (const name of ["dirty_south_festive_map.jpg", "dirty_south_festive_map.png"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", "assets", name))) return `/assets/${name}`;
  }
  return null;
}

export default async function DirtySouthParty({ searchParams }: { searchParams: Promise<Params> }) {
  const { nightlife, days, planner } = loadPlanner();
  const params = await searchParams;
  // Sponsor holds the page Mon–Wed; ?preview=sponsor shows it any day (for Andy + sponsors).
  const showSponsor = (isSponsorDay() || params.preview === "sponsor") && nightlife.sponsor ? nightlife.sponsor : null;
  // ItemList of the unique venues on this week's plan — structured data so
  // Google understands this page as a curated nightlife list, not a wall of links.
  const seen = new Set<string>();
  const venues = Object.values(nightlife.days).flat().filter((i) => {
    const name = i.venue.split(" · ")[0];
    return seen.has(name) ? false : (seen.add(name), true);
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dirty South Party Planner — South Knoxville nightlife",
    description: DESCRIPTION,
    url: `${SITE}/dirtysouthparty`,
    numberOfItems: venues.length,
    itemListElement: venues.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: v.venue.split(" · ")[0],
      // href is required by the type, but a hand-edited nightlife.json has taken the
      // whole page down with a 500 before now (2026-09-16) — treat it as optional here.
      url: v.href?.startsWith("http") ? v.href : `${SITE}${v.href ?? "/dirtysouthparty"}`,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <DirtySouth
        days={days}
        defaultDay={pickDefaultDay()}
        weekend={nightlife.weekend}
        fontClass={anton.className}
        mapSrc={findMap()}
        sponsor={showSponsor}
        planner={planner}
        initial={freshPlan(parsePlanParams(params), planner)}
      />
    </>
  );
}
