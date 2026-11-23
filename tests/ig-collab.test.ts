// @vitest-environment node
import { describe, it, expect } from "vitest";
import { collaboratorsFor, collabInvitesOn, dropCollaborators, publishPost, COLLAB_MOVE, MAX_COLLABORATORS } from "../scripts/ig-container.mjs";

describe("collabInvitesOn", () => {
  it("invites unless Andy answered Don't on the dashboard", () => {
    expect(collabInvitesOn([])).toBe(true);
    expect(collabInvitesOn(undefined)).toBe(true);
    expect(collabInvitesOn([{ key: COLLAB_MOVE, answer: "go" }])).toBe(true);
    expect(collabInvitesOn([{ key: "tag-every-post", answer: "no" }])).toBe(true);
    expect(collabInvitesOn([{ key: COLLAB_MOVE, answer: "no" }])).toBe(false);
  });
});

describe("collaboratorsFor", () => {
  it("invites the venue, the first handle, lower-case and without the @", () => {
    expect(collaboratorsFor(["@ThePinkCactusKnox", "@planetdoomshows", "@iamdoomsayer"])).toEqual(["thepinkcactusknox"]);
    expect(MAX_COLLABORATORS).toBe(1);
  });
  it("skips a handle Meta has refused and takes the next, or nobody", () => {
    expect(collaboratorsFor(["@dead", "@kernsknox"], { untaggable: new Set(["dead"]) })).toEqual(["kernsknox"]);
    expect(collaboratorsFor(["@dead"], { untaggable: new Set(["dead"]) })).toBeUndefined();
    expect(collaboratorsFor([])).toBeUndefined();
    expect(collaboratorsFor(undefined)).toBeUndefined();
  });
  it("never sends more than Instagram's three", () => {
    expect(collaboratorsFor(["@a", "@b", "@c", "@d"], { max: 3 })).toEqual(["a", "b", "c"]);
  });
});

describe("dropCollaborators", () => {
  it("takes the invite off the post and remembers who it was", () => {
    const post: Record<string, unknown> = { collaborators: ["kernsknox"], userTags: [{ username: "kernsknox", x: 0.5, y: 0.88 }] };
    expect(dropCollaborators(post)).toBe(1);
    expect(post.collaborators).toBeUndefined();
    expect(post.droppedCollaborators).toEqual(["kernsknox"]);
    expect(post.userTags).toHaveLength(1);
  });
  it("returns zero when there was no invite, so the caller does not loop", () => {
    const post: Record<string, unknown> = { userTags: [{ username: "kernsknox", x: 0.5, y: 0.88 }] };
    expect(dropCollaborators(post)).toBe(0);
    expect(post.droppedCollaborators).toBeUndefined();
  });
});

function fakeGraph() {
  const calls: Array<{ url: string; body?: Record<string, string> }> = [];
  const fetchImpl = (async (url: string, init?: { body?: URLSearchParams }) => {
    calls.push({ url, body: init?.body ? Object.fromEntries(init.body) : undefined });
    let out: unknown;
    if (url.endsWith("/media")) out = { id: `c${calls.length}` };
    else if (url.endsWith("/media_publish")) out = { id: "published" };
    else out = { status_code: "FINISHED" };
    return { ok: true, json: async () => out } as Response;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}
const io = (fetchImpl: typeof fetch) => ({ graph: "https://g", userId: "u", token: "t", fetchImpl, sleep: async () => {}, warn: () => {} });

describe("publishPost with collaborators", () => {
  it("sends the invite on a single image's container, beside the in-image tag", async () => {
    const { calls, fetchImpl } = fakeGraph();
    const tags = [{ username: "kernsknox", x: 0.5, y: 0.88 }];
    await publishPost({ imageUrl: "https://s/a.jpg", caption: "c", userTags: tags, collaborators: ["kernsknox"] }, io(fetchImpl));
    expect(calls[0].body).toMatchObject({ image_url: "https://s/a.jpg", user_tags: JSON.stringify(tags), collaborators: JSON.stringify(["kernsknox"]) });
  });
  it("sends none when the post carries none", async () => {
    const { calls, fetchImpl } = fakeGraph();
    await publishPost({ imageUrl: "https://s/a.jpg", caption: "c" }, io(fetchImpl));
    expect(calls[0].body).not.toHaveProperty("collaborators");
  });
  it("leaves the roundup carousel alone (seven venues, three seats)", async () => {
    const { calls, fetchImpl } = fakeGraph();
    await publishPost({ slides: ["https://s/1.jpg", "https://s/2.jpg"], caption: "c", collaborators: ["kernsknox"] }, io(fetchImpl));
    for (const c of calls) expect(c.body ?? {}).not.toHaveProperty("collaborators");
  });
});
