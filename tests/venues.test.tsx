import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { DirtySouth } from "@/components/DirtySouth";
import { loadNightlife, withVenueLogos } from "@/lib/nightlife";
import { loadVenues, matchVenue, brandName } from "@/lib/venues";

const registry = loadVenues();
const nightlife = loadNightlife();

describe("venue registry", () => {
  it("every logo path points at a file that actually ships", () => {
    for (const [key, v] of Object.entries(registry)) {
      if (!v.logo) continue;
      const file = path.join(process.cwd(), "public", v.logo.replace(/^\//, ""));
      expect(fs.existsSync(file), `${key} → ${v.logo}`).toBe(true);
    }
  });
  it("every entry records where its logo came from, or why there isn't one", () => {
    for (const [key, v] of Object.entries(registry)) {
      expect(v.name, key).toBeTruthy();
      expect(v.match.length, key).toBeGreaterThan(0);
      // A logo must name its source; a missing logo must explain the gap.
      expect(v.logo ? v.source : v.sourceNote, key).toBeTruthy();
    }
  });
  it("longest alias wins, so a room or address suffix can't misroute a venue", () => {
    expect(matchVenue("Kern's Food Hall rooftop", registry)?.name).toBe("Kern's");
    expect(matchVenue("SoKno Taco Cantina · 3701 Sevierville Pike", registry)?.name).toBe("SoKno Taco Cantina");
    expect(matchVenue("Hi-Wire · Barber St", registry)?.name).toBe("Hi-Wire Brewing");
    expect(matchVenue("The Pink Cactus · 1147 Sevier Ave", registry)?.name).toBe("The Pink Cactus");
    expect(matchVenue("Some Bar Nobody Registered", registry)).toBeNull();
  });
  it("brandName falls back to the pre-address half of an unregistered venue", () => {
    expect(brandName("Wild Love Bakehouse · 1625 N Central", registry)).toBe("Wild Love Bakehouse");
  });
  it("withVenueLogos decorates every item and never drops one", () => {
    const days = withVenueLogos(nightlife.days, registry);
    for (const day of ["Thu", "Fri", "Sat", "Sun"] as const) {
      expect(days[day].length).toBe(nightlife.days[day].length);
      for (const item of days[day]) {
        expect(item.brand).toBeTruthy();
        expect(item).toHaveProperty("logo"); // null is a valid, expected value
      }
    }
  });
});

describe("logo chip on the checklist", () => {
  it("draws the venue's logo when the registry has one", () => {
    const days = withVenueLogos(nightlife.days, registry);
    const { container } = render(
      <DirtySouth days={days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />,
    );
    const chips = container.querySelectorAll(".ds-logo");
    expect(chips.length).toBe(days.Thu.length); // one chip per row, always
    const srcs = [...container.querySelectorAll<HTMLImageElement>(".ds-logo img")].map((i) => i.src);
    expect(srcs.some((s) => s.includes("/assets/venues/hi-wire.svg"))).toBe(true);
    expect(srcs.some((s) => s.includes("/assets/venues/angry-dumplings.png"))).toBe(true);
  });
  it("falls back to a wordmark chip for a venue with no logo, keeping the row shape", () => {
    const days = { ...nightlife.days, Thu: [{ ...nightlife.days.Thu[0], venue: "Nowhere Bar · 1 Main St", logo: null, brand: "Nowhere Bar" }] };
    const { container } = render(
      <DirtySouth days={days} defaultDay="Thu" weekend={nightlife.weekend} fontClass="" />,
    );
    const chip = container.querySelector(".ds-logo")!;
    expect(chip.querySelector("img")).toBeNull();
    expect(chip.textContent).toBe("Nowhere Bar");
  });
  it("the chip is aria-hidden — the venue name is already in the row's text", () => {
    const days = withVenueLogos(nightlife.days, registry);
    const { container } = render(
      <DirtySouth days={days} defaultDay="Fri" weekend={nightlife.weekend} fontClass="" />,
    );
    for (const chip of container.querySelectorAll(".ds-logo")) {
      expect(chip.getAttribute("aria-hidden")).toBe("true");
    }
    // and the row still names the venue for a screen reader
    expect(screen.getAllByText(/Earl's/).length).toBeGreaterThan(0);
  });
});
