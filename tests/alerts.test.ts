import { describe, it, expect } from "vitest";
import { activeAlerts, isClosed, earToday, loadAlerts, getAlert, type EarAlert } from "@/lib/alerts";

const a: EarAlert = { slug: "x", label: "L", banner: "B", title: "T", from: "2026-11-20", until: "2026-11-22", body: ["p"] };

describe("Ear Alerts", () => {
  it("runs from `from` through `until` inclusive", () => {
    expect(activeAlerts([a], "2026-11-19")).toEqual([]);
    expect(activeAlerts([a], "2026-11-20")).toHaveLength(1);
    expect(activeAlerts([a], "2026-11-22")).toHaveLength(1);
    expect(activeAlerts([a], "2026-11-23")).toEqual([]);
    expect(isClosed(a, "2026-11-23")).toBe(true);
  });
  it("uses New York's date, not UTC", () => {
    // 2026-11-23 02:00 UTC is still Sunday the 22nd in Knoxville
    expect(earToday(new Date("2026-11-23T02:00:00Z"))).toBe("2026-11-22");
  });
  it("ships the planning survey alert with its links", () => {
    const s = getAlert("knoxville-planning-survey", loadAlerts());
    expect(s?.until).toBe("2026-11-22");
    expect(s?.cta?.href).toBe("https://www.surveymonkey.com/r/knoxoptions");
  });
});
