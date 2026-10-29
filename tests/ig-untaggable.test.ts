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
