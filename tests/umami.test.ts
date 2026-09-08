import { describe, it, expect } from "vitest";
import { shareHeaders, shareIdFrom, dayWindow } from "../scripts/umami.mjs";

describe("shareHeaders", () => {
  // The bit that cost an hour: the token alone returns 401 on this Umami build.
  it("sends the share context alongside the token", () => {
    const h = shareHeaders({ token: "jwt", shareType: 1 });
    expect(h["x-umami-share-token"]).toBe("jwt");
    expect(h["x-umami-share-context"]).toBe("1");
  });

  it("stringifies a share context that is not already a string", () => {
    expect(shareHeaders({ token: "t", shareType: 2 })["x-umami-share-context"]).toBe("2");
  });

  it("defaults the context to 1 rather than sending undefined", () => {
    expect(shareHeaders({ token: "t" })["x-umami-share-context"]).toBe("1");
  });
});

describe("shareIdFrom", () => {
  it("pulls the id out of a share URL", () => {
    expect(shareIdFrom("https://stats.note15.com/share/Js9A8zQzjuKQ8KKr")).toBe("Js9A8zQzjuKQ8KKr");
  });
  it("tolerates a trailing slash or query", () => {
    expect(shareIdFrom("https://stats.note15.com/share/abc123/")).toBe("abc123");
    expect(shareIdFrom("https://stats.note15.com/share/abc123?x=1")).toBe("abc123");
  });
  it("accepts a bare id", () => {
    expect(shareIdFrom("abc123")).toBe("abc123");
  });
  it("throws on something that is not a share link", () => {
    expect(() => shareIdFrom("https://stats.note15.com/websites/9ee0")).toThrow(/share/i);
  });
});

describe("dayWindow", () => {
  it("spans the whole local day range, inclusive of the end day", () => {
    const { startAt, endAt } = dayWindow("2026-09-02", "2026-09-08");
    expect(endAt - startAt).toBeGreaterThan(6 * 86400_000);
    expect(endAt - startAt).toBeLessThan(7 * 86400_000 + 1000);
  });
  it("returns milliseconds, which is what the API wants", () => {
    expect(String(dayWindow("2026-09-02", "2026-09-02").startAt)).toHaveLength(13);
  });
});
