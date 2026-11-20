import { ImageResponse } from "next/og";
import { loadPlanner } from "@/lib/planner-data";
import { PLAN_CATS, PLAN_DAYS, freshPlan, lineup, parsePlanParams, type PlanState } from "@/lib/planner";
import { CARD_DIMS, PlanCard, cardFonts, logoData, type CardSize } from "@/lib/planCard";
import { pickDefaultDay } from "@/lib/nightlife";

// /dirtysouthparty/plan-image?day=Fri&eat=…&drink=…&merry=…&w=nov-19-22[&size=tall]
// The game-plan picture for a plan link: the link preview's og:image (wide) and the
// share sheet's attachment (tall). It only ever draws the Ear's own listings — the
// query names row ids, never text or images — so it can't be used to host anything.
export const dynamic = "force-dynamic";

const DAY_NAMES = { Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" } as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const size: CardSize = url.searchParams.get("size") === "tall" ? "tall" : "wide";
  const { planner } = loadPlanner();
  const parsed = freshPlan(parsePlanParams(Object.fromEntries(url.searchParams)), planner);
  const day = parsed.day && PLAN_DAYS.includes(parsed.day) ? parsed.day : pickDefaultDay();
  const state: PlanState = { day, picks: parsed.picks ?? {}, types: parsed.types ?? PLAN_CATS };
  const plan = lineup(planner, state).map((p) => ({ ...p, logo: logoData(p.option.logo) }));
  return new ImageResponse(
    <PlanCard size={size} dayName={DAY_NAMES[day]} dateLabel={planner.dates[day]} plan={plan} />,
    {
      ...CARD_DIMS[size],
      fonts: cardFonts(),
      headers: {
        // The same link always draws the same plan for its week; let previewers cache it.
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
