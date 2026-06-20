import { describe, it, expect } from "vitest";
import { loadEditions, getLatest, getBySlug, getPast } from "@/lib/editions";
import path from "node:path";

const dir = path.resolve(__dirname, "fixtures/editions");

describe("editions loader", () => {
  it("loads + sorts newest first", () => {
    const all = loadEditions(dir);
    expect(all.map((e) => e.slug)).toEqual(["2026-06-20", "2026-06-13"]);
  });
  it("getLatest returns newest", () => {
    expect(getLatest(dir).slug).toBe("2026-06-20");
  });
  it("getBySlug finds one; missing returns null", () => {
    expect(getBySlug(dir, "2026-06-13")?.number).toBeDefined();
    expect(getBySlug(dir, "nope")).toBeNull();
  });
  it("getPast excludes the latest", () => {
    expect(getPast(dir).map((e) => e.slug)).toEqual(["2026-06-13"]);
  });
});
