// @vitest-environment node
import { describe, it, expect } from "vitest";
import { untaggableUsernames, userTagsFor } from "../scripts/ig-container.mjs";

// The 2026-10-29 failure, as Meta sent it.
const refused = (msg: string, sub = 2207018) => ({ error: { code: 110, error_subcode: sub, error_user_msg: msg } });

describe("untaggableUsernames", () => {
  it("reads the refused handle out of a 2207018", () => {
    expect(untaggableUsernames(refused("The following user(s) cannot be accessed: thecomedysphereknox"))).toEqual(["thecomedysphereknox"]);
  });
  it("reads several, with or without @ and a full stop", () => {
    expect(untaggableUsernames(refused("The following user(s) cannot be accessed: @a_b, c.d."))).toEqual(["a_b", "c.d"]);
  });
  it("is empty for any other error", () => {
    expect(untaggableUsernames(refused("The following user(s) cannot be accessed: x", 2207027))).toEqual([]);
    expect(untaggableUsernames({ error: { code: 9007 } })).toEqual([]);
    expect(untaggableUsernames(undefined)).toEqual([]);
  });
});

describe("userTagsFor untaggable", () => {
  it("leaves a refused handle out of the picture", () => {
    const tags = userTagsFor(["@thepinkcactusknox", "@TheComedySphereKnox"], { untaggable: new Set(["thecomedysphereknox"]) });
    expect(tags.map((t: { username: string }) => t.username)).toEqual(["thepinkcactusknox"]);
  });
  it("returns nothing when every handle is refused", () => {
    expect(userTagsFor(["@x"], { untaggable: new Set(["x"]) })).toBeUndefined();
  });
});

import { dropRefusedTags } from "../scripts/ig-container.mjs";

describe("dropRefusedTags", () => {
  const tag = (username: string) => ({ username, x: 0.5, y: 0.88 });
  it("takes a refused handle out of a single image's tags and remembers it", () => {
    const post: Record<string, unknown> = { userTags: [tag("thepinkcactusknox"), tag("TheComedySphereKnox")] };
    expect(dropRefusedTags(post, ["thecomedysphereknox"])).toBe(1);
    expect(post.userTags).toEqual([tag("thepinkcactusknox")]);
    expect(post.droppedTags).toEqual(["thecomedysphereknox"]);
  });
  it("takes it out of every roundup slide too, leaving the slide list aligned", () => {
    const post: Record<string, unknown> = { slides: ["c", "a", "b"], slideTags: [null, [tag("kernsknox")], [tag("dead_handle"), tag("printshopbeer")]] };
    expect(dropRefusedTags(post, ["dead_handle"])).toBe(1);
    expect(post.slideTags).toEqual([null, [tag("kernsknox")], [tag("printshopbeer")]]);
  });
  it("drops the whole tag list when nothing is left, and the slide list when every slide is bare", () => {
    const post: Record<string, unknown> = { userTags: [tag("x")], slideTags: [null, [tag("x")]] };
    expect(dropRefusedTags(post, ["x"])).toBe(2);
    expect(post.userTags).toBeUndefined();
    expect(post.slideTags).toBeUndefined();
  });
  it("returns zero when the error was not about a tag we carry, so the caller does not loop", () => {
    const post: Record<string, unknown> = { userTags: [tag("kernsknox")] };
    expect(dropRefusedTags(post, ["someone_else"])).toBe(0);
    expect(dropRefusedTags(post, [])).toBe(0);
    expect(post.userTags).toEqual([tag("kernsknox")]);
  });
});
