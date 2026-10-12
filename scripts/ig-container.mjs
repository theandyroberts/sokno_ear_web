// Make a post on Instagram: build the media container, wait for Meta to process it,
// publish. Lifted out of ig-post.mjs so a carousel and a single image share one path
// and both can be tested without touching Instagram.
//
// A single image is one container. A carousel is one child container per slide
// (`is_carousel_item`), then a parent (`media_type=CAROUSEL`, `children=<ids>`) that
// carries the caption. Only the parent is published.

/** Meta's transient publish errors — the container is fine, the media just is not ready. */
export const TRANSIENT_CODES = new Set([9007, 2207027, 1, 2]);
/** In-run publish retries, and the waits between them. Worst case ~75s. */
export const PUBLISH_BACKOFF_MS = [5000, 20000, 50000];
/** How long a container may take to reach FINISHED: an image is seconds, a Reel is minutes. */
export const CONTAINER_WAIT = { image: { polls: 10, everyMs: 4000 }, video: { polls: 36, everyMs: 10000 } };

export function isTransient(payload) {
  const e = payload?.error ?? {};
  return TRANSIENT_CODES.has(Number(e.code)) || TRANSIENT_CODES.has(Number(e.error_subcode))
    || /not ready|try again|transient|temporarily/i.test(String(e.message ?? ""));
}

/** Where the in-image tag sits: low centre, on the banner's venue band. */
export const USER_TAG_SPOT = { x: 0.5, y: 0.88 };
/** The dashboard move that turned tagging every post on: "Tag the venue in every picture". */
export const TAG_EVERY_POST_MOVE = "tag-every-post";
/** The move that put the artist in the picture too: "Tag the artist in the picture too" (2026-10-12). */
export const TAG_THE_ARTIST_MOVE = "tag-the-artist";
/** The move that holds the weekly ad while the phone line changes: "The Call-the-Ear ad is out" (2026-10-12). */
export const AD_MOVE = "call-the-ear-ad";
/** Instagram allows 20 tags on an image; a banner never needs more than this. */
export const MAX_IMAGE_TAGS = 5;

/** Every tagged banner is tagged in the image unless Andy said "Don't" — then back to the 50/50 test. */
export function imageTagsOn(moves) {
  return !(moves ?? []).some((m) => m.key === TAG_EVERY_POST_MOVE && m.answer === "no");
}

/** Every handle a story carries goes in the picture (venue first) unless Andy said "Don't" — then the venue alone. */
export function artistTagsOn(moves) {
  return !(moves ?? []).some((m) => m.key === TAG_THE_ARTIST_MOVE && m.answer === "no");
}

/**
 * The weekly "Call the Ear" ad runs unless the hold is open. Andy asked for it out of
 * the No. 18 drip while he changes the phone-in system (2026-10-09, on the dashboard);
 * the hold is Andy's move `call-the-ear-ad`, and his "Done" on it brings the ad back
 * the next Wednesday with no run in between. No move, or a closed one, means on.
 */
export function adIsOn(moves) {
  return !(moves ?? []).some((m) => m.key === AD_MOVE && !m.closedAt && m.answer !== "done");
}

/** Stable 50/50 split on a story id — same story, same arm, every restage. The old test's split. */
export function abBucket(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 2 === 0;
}

/**
 * The `user_tags` a story banner carries, tagged in the image on the band. The venue
 * (first handle) always; since 2026-10-12 every other verified handle the story names
 * too — the band, the promoter, the organizer — because the posts that reached
 * hundreds in No. 17 were the ones where somebody with an audience was tagged.
 * Tags are spread along the band so none sits on another. Untagged stays untagged.
 *
 * @param {string[]} tags   caption handles, "@kernsknox" first
 * @param {{everyone?: boolean}} [opts]   everyone=false tags the venue alone (Andy's "Don't")
 * @returns {Array<{username: string, x: number, y: number}> | undefined}
 */
export function userTagsFor(tags, { everyone = true } = {}) {
  const handles = [...new Set((tags ?? []).filter((t) => /^@[a-z0-9_.]+$/i.test(String(t))).map((t) => t.replace(/^@/, "")))];
  if (!handles.length) return undefined;
  const chosen = everyone ? handles.slice(0, MAX_IMAGE_TAGS) : handles.slice(0, 1);
  const n = chosen.length;
  // one tag at centre; two or more spread between x 0.2 and 0.8 along the band
  return chosen.map((username, i) => ({ username, x: n === 1 ? USER_TAG_SPOT.x : +(0.2 + (0.6 * i) / (n - 1)).toFixed(3), y: USER_TAG_SPOT.y }));
}

/**
 * @param {object} post   a queue entry: imageUrl, caption, optional slides[], userTags[], videoUrl + coverUrl (a Reel)
 * @param {object} io
 * @param {string} io.graph  API base
 * @param {string} io.userId
 * @param {string} io.token
 * @param {typeof fetch} [io.fetchImpl]
 * @param {(ms: number) => Promise<void>} [io.sleep]
 * @param {(msg: string) => void} [io.warn]
 * @returns {Promise<{id: string, kind: "image"|"carousel"|"reel", containers: number}>}
 */
export async function publishPost(post, { graph, userId, token, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), warn = console.warn }) {
  const form = (body) => ({ method: "POST", body: new URLSearchParams({ ...body, access_token: token }) });

  async function container(body, what, wait = CONTAINER_WAIT.image) {
    const res = await fetchImpl(`${graph}/${userId}/media`, form(body));
    const made = await res.json().catch(() => ({}));
    if (!res.ok || !made.id) throw new Error(`${what}: ${JSON.stringify(made).slice(0, 300)}`);
    // Wait for Meta to fetch + process — publishing immediately races the processing
    // and fails with code 9007 "media not ready". A Reel is transcoded, which takes
    // minutes, so it gets the video wait (`status` says why when it ends in ERROR).
    for (let i = 0; i < wait.polls; i++) {
      const stRes = await fetchImpl(`${graph}/${made.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
      const st = await stRes.json().catch(() => ({}));
      if (st.status_code === "FINISHED") return made.id;
      if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`${what} processing ${st.status_code}: ${JSON.stringify(st).slice(0, 200)}`);
      await sleep(wait.everyMs);
    }
    throw new Error(`${what} never reached FINISHED after ${Math.round((wait.polls * wait.everyMs) / 1000)}s`);
  }

  const slides = post.slides?.length ? post.slides : null;
  if (slides && (slides.length < 2 || slides.length > 10)) throw new Error(`carousel needs 2 to 10 slides, got ${slides.length}`);

  let creationId, containers = 1;
  const kind = slides ? "carousel" : post.videoUrl ? "reel" : "image";
  if (post.videoUrl) {
    // The weekly Reel (scripts/ig-reel.py). `share_to_feed` puts it in the grid as well
    // as the Reels tab; the poster is the first frame of the feature paragraph.
    const body = { media_type: "REELS", video_url: post.videoUrl, caption: post.caption, share_to_feed: "true" };
    if (post.coverUrl) body.cover_url = post.coverUrl;
    creationId = await container(body, "reel", CONTAINER_WAIT.video);
  } else if (slides) {
    const children = [];
    for (const [i, url] of slides.entries()) children.push(await container({ image_url: url, is_carousel_item: "true" }, `slide ${i + 1}`));
    creationId = await container({ media_type: "CAROUSEL", children: children.join(","), caption: post.caption }, "carousel");
    containers = children.length + 1;
  } else {
    // `user_tags` tags the venue IN THE IMAGE, the one surface in this pipeline that
    // puts a post in front of non-followers. ig-queue.mjs sets it on every tagged
    // story banner (userTagsFor); until 2026-10-05 it was a 50/50 test (`abGroup`).
    const body = { image_url: post.imageUrl, caption: post.caption };
    if (post.userTags?.length) body.user_tags = JSON.stringify(post.userTags);
    creationId = await container(body, "container");
  }

  // Publish — retried on a transient, because "FINISHED" is not a promise. Both silent
  // losses of September happened exactly here. The container stays valid for 24h, so
  // re-issuing against the same creation_id is safe and is not a duplicate post.
  for (let attempt = 0; attempt <= PUBLISH_BACKOFF_MS.length; attempt++) {
    const pubRes = await fetchImpl(`${graph}/${userId}/media_publish`, form({ creation_id: creationId }));
    const body = await pubRes.json().catch(() => ({}));
    if (pubRes.ok && body.id) return { id: body.id, kind, containers };
    const retryable = isTransient(body) && attempt < PUBLISH_BACKOFF_MS.length;
    if (!retryable) throw new Error(`publish: ${JSON.stringify(body).slice(0, 300)}`);
    warn(`  … publish transient (attempt ${attempt + 1}), retrying in ${PUBLISH_BACKOFF_MS[attempt] / 1000}s`);
    await sleep(PUBLISH_BACKOFF_MS[attempt]);
  }
  throw new Error("publish: exhausted in-run retries");
}
