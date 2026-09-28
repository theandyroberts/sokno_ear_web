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

export function isTransient(payload) {
  const e = payload?.error ?? {};
  return TRANSIENT_CODES.has(Number(e.code)) || TRANSIENT_CODES.has(Number(e.error_subcode))
    || /not ready|try again|transient|temporarily/i.test(String(e.message ?? ""));
}

/**
 * @param {object} post   a queue entry: imageUrl, caption, optional slides[], userTags[]
 * @param {object} io
 * @param {string} io.graph  API base
 * @param {string} io.userId
 * @param {string} io.token
 * @param {typeof fetch} [io.fetchImpl]
 * @param {(ms: number) => Promise<void>} [io.sleep]
 * @param {(msg: string) => void} [io.warn]
 * @returns {Promise<{id: string, kind: "image"|"carousel", containers: number}>}
 */
export async function publishPost(post, { graph, userId, token, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), warn = console.warn }) {
  const form = (body) => ({ method: "POST", body: new URLSearchParams({ ...body, access_token: token }) });

  async function container(body, what) {
    const res = await fetchImpl(`${graph}/${userId}/media`, form(body));
    const made = await res.json().catch(() => ({}));
    if (!res.ok || !made.id) throw new Error(`${what}: ${JSON.stringify(made).slice(0, 300)}`);
    // Wait for Meta to fetch + process — publishing immediately races the processing
    // and fails with code 9007 "media not ready".
    for (let i = 0; i < 10; i++) {
      const stRes = await fetchImpl(`${graph}/${made.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
      const st = await stRes.json().catch(() => ({}));
      if (st.status_code === "FINISHED") return made.id;
      if (st.status_code === "ERROR") throw new Error(`${what} processing ERROR: ${JSON.stringify(st).slice(0, 200)}`);
      await sleep(4000);
    }
    throw new Error(`${what} never reached FINISHED after 40s`);
  }

  const slides = post.slides?.length ? post.slides : null;
  if (slides && (slides.length < 2 || slides.length > 10)) throw new Error(`carousel needs 2 to 10 slides, got ${slides.length}`);

  let creationId, containers = 1;
  if (slides) {
    const children = [];
    for (const [i, url] of slides.entries()) children.push(await container({ image_url: url, is_carousel_item: "true" }, `slide ${i + 1}`));
    creationId = await container({ media_type: "CAROUSEL", children: children.join(","), caption: post.caption }, "carousel");
    containers = children.length + 1;
  } else {
    // `user_tags` tags the venue IN THE IMAGE, the one surface in this pipeline that
    // puts a post in front of non-followers. ig-queue.mjs sets it on half the tagged
    // story banners (`abGroup`), captions held identical.
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
    if (pubRes.ok && body.id) return { id: body.id, kind: slides ? "carousel" : "image", containers };
    const retryable = isTransient(body) && attempt < PUBLISH_BACKOFF_MS.length;
    if (!retryable) throw new Error(`publish: ${JSON.stringify(body).slice(0, 300)}`);
    warn(`  … publish transient (attempt ${attempt + 1}), retrying in ${PUBLISH_BACKOFF_MS[attempt] / 1000}s`);
    await sleep(PUBLISH_BACKOFF_MS[attempt]);
  }
  throw new Error("publish: exhausted in-run retries");
}
