import fs from "node:fs";
import path from "node:path";
import localFont from "next/font/local";
import { loadNightlife, pickDefaultDay } from "@/lib/nightlife";
import { DirtySouth } from "@/components/DirtySouth";
import type { Metadata } from "next";

// The flyer's landing page: soknoear.com/dirtysouthparty (QR codes add ?src=…
// for attribution — same page). Day tabs default to tonight, Thu–Sun.
export const dynamic = "force-dynamic";

const TITLE = "Party in the Dirty South — SoKno's plan for the night";
const DESCRIPTION =
  "Happy hours, dinner, live music, karaoke, and the late hang — South Knoxville's nightlife checklist, night by night, from The South Knoxville Ear.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/dirtysouthparty" },
  openGraph: {
    title: TITLE, description: DESCRIPTION, type: "website",
    url: "https://soknoear.com/dirtysouthparty",
    siteName: "The South Knoxville Ear", images: ["/assets/masthead.jpg"],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const anton = localFont({ src: "./Anton-Regular.woff2", display: "swap" });

// The territory map link appears as soon as the image lands in public/assets.
// The optimized .jpg is preferred; the .png is Andy's full-quality source.
function findMap(): string | null {
  for (const name of ["dirty_south_festive_map.jpg", "dirty_south_festive_map.png"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", "assets", name))) return `/assets/${name}`;
  }
  return null;
}

export default function DirtySouthParty() {
  const nightlife = loadNightlife();
  return (
    <DirtySouth
      days={nightlife.days}
      defaultDay={pickDefaultDay()}
      weekend={nightlife.weekend}
      fontClass={anton.className}
      mapSrc={findMap()}
    />
  );
}
