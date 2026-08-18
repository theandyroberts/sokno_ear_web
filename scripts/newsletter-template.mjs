// Builds the weekly subscriber email from an episode's JSON.
//
// Nothing in here is week-specific. Subject, hero, lede and the rundown are all
// derived from the episode, so publishing a new episode is the only step needed to
// change what subscribers receive — there is no copy to hand-edit before a send.
//
// An episode may override the two editorial bits by adding an optional
// `newsletter: { subject, lede, heroImage }` block; anything omitted is derived.

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Feature titles carry a subtitle after a colon or em dash; the email wants the hook only. */
export function headline(title) {
  return String(title ?? "").split(/\s[—–]\s|:/)[0].trim();
}

const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** "#kerns-weekend" → the story's own page; anything already absolute is left alone. */
export function cardHref(href, slug, home) {
  if (!href) return home;
  if (/^https?:\/\//.test(href)) return href;
  const id = href.startsWith("#") ? href.slice(1) : href;
  return `${home}/${slug}/${id}`;
}

/**
 * Hero image for the email. Prefers a hand-made `<name>_email.jpg` companion when one
 * exists — those are sized for mail clients — and otherwise uses the feature art.
 * `fileExists` takes a public-relative path ("/assets/spots/x_email.jpg").
 */
export function resolveHero(featureImage, fileExists = () => false) {
  if (!featureImage) return undefined;
  const m = featureImage.match(/^(.*)\.(png|jpe?g|webp)$/i);
  if (m) {
    for (const ext of ["jpg", "jpeg", "png"]) {
      const candidate = `${m[1]}_email.${ext}`;
      if (fileExists(candidate)) return candidate;
    }
  }
  return featureImage;
}

/** Scanner cards that aren't just pointing back at the feature. */
function otherCards(episode) {
  return episode.scanner.filter((c) => c.href !== `#${episode.feature.id}`);
}

export function buildSubject(episode) {
  if (episode.newsletter?.subject) return episode.newsletter.subject;

  const featureCard = episode.scanner.find((c) => c.href === `#${episode.feature.id}`);
  const lead = headline(featureCard?.title ?? episode.feature.title);
  const rest = otherCards(episode);
  const second = rest.find((c) => c.hot) ?? rest[0];

  if (second) {
    const pair = `${lead} — and ${lowerFirst(headline(second.title))}`;
    if (pair.length <= 80) return pair;
  }
  const when = episode.shortDate ?? episode.dateLabel ?? episode.date;
  return when ? `${lead} · ${when}` : lead;
}

/**
 * @returns {{subject: string, html: string, text: string, hero: string|undefined, warnings: string[]}}
 */
export function buildNewsletter(episode, opts = {}) {
  const home = opts.home ?? "https://soknoear.com";
  const fileExists = opts.fileExists ?? (() => false);
  const warnings = [];

  const subject = buildSubject(episode);
  const hero = episode.newsletter?.heroImage ?? resolveHero(episode.feature.image, fileExists);
  if (hero && hero === episode.feature.image && /\.png$/i.test(hero)) {
    warnings.push(`hero is a full-size PNG (${hero}) — consider an _email.jpg companion`);
  }

  const lede = episode.newsletter?.lede ?? episode.feature.deck ?? "";
  const featureTitle = headline(episode.feature.title);
  const rest = otherCards(episode);
  const audio = episode.sidebar?.audio;
  // "04:09" is fine on a player but reads wrong in a sentence — say "4:09".
  const spokenDuration = String(audio?.duration ?? "").replace(/^0(\d:)/, "$1");
  const audioLine = audio
    ? `There's a ${spokenDuration} audio briefing in there too, if you'd rather listen than read.`
    : "";
  const dateLine = episode.dateLabel ?? episode.date;

  const rows = rest
    .map(
      (c) => `
  <tr><td style="padding:3px 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;color:#171512;">
    <a href="${esc(cardHref(c.href, episode.slug, home))}" target="_blank" style="color:#171512;text-decoration:none;"><strong>${esc(headline(c.title))}</strong></a> — ${esc(c.blurb)}
  </td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#e9dcc4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9dcc4;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#F3E8D2;border:1px solid #171512;">
  <tr><td align="center" style="padding:22px 24px 8px;">
    <a href="${home}" target="_blank" style="text-decoration:none;color:#171512;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:bold;letter-spacing:0.02em;text-transform:uppercase;color:#171512;">★ The South Knoxville Ear ★</div>
      <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#A94A34;margin-top:5px;">South Knoxville Events &amp; Rumors</div>
    </a>
  </td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:2px solid #171512;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td align="center" style="padding:10px 24px 0;font-family:Georgia,serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a7060;">${esc(dateLine)}</td></tr>
  <tr><td style="padding:14px 24px 2px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;color:#171512;">Hey neighbor —</td></tr>
  <tr><td style="padding:2px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#171512;">A fresh episode of <strong>The South Knoxville Ear</strong> is up.</td></tr>${
    hero
      ? `
  <tr><td align="center" style="padding:8px 24px;">
    <a href="${home}" target="_blank"><img src="${home}${esc(hero)}" alt="${esc(featureTitle)}" width="512" style="display:block;width:100%;max-width:512px;height:auto;border:2px solid #171512;border-radius:8px;"></a>
  </td></tr>`
      : ""
  }
  <tr><td style="padding:12px 24px 4px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#171512;"><strong>${esc(featureTitle)}.</strong> ${esc(lede)}</td></tr>${
    rows
      ? `
  <tr><td style="padding:14px 24px 4px;font-family:Georgia,serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#A94A34;">Also inside</td></tr>${rows}`
      : ""
  }${
    audioLine
      ? `
  <tr><td style="padding:12px 24px 4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;color:#171512;">${esc(audioLine)}</td></tr>`
      : ""
  }
  <tr><td align="center" style="padding:18px 24px 6px;">
    <a href="${home}" target="_blank" style="display:inline-block;background:#A94A34;color:#F3E8D2;text-decoration:none;font-family:Georgia,serif;font-weight:bold;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;padding:13px 28px;border-radius:6px;">★ Read this weekend's Ear</a>
  </td></tr>
  <tr><td align="center" style="padding:4px 24px 18px;font-family:Georgia,serif;font-size:14px;color:#171512;">or head to <a href="${home}" target="_blank" style="color:#A94A34;font-weight:bold;">soknoear.com</a></td></tr>
  <tr><td style="padding:0 24px;"><div style="border-top:1px solid #c9b896;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:14px 24px 20px;font-family:Georgia,serif;font-size:12px;line-height:1.5;color:#7a7060;">You're getting this because you signed up for The South Knoxville Ear at soknoear.com. Not for you? Just reply and I'll take you off the list. — Andy</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    "Hey neighbor —",
    "",
    `A fresh episode of The South Knoxville Ear is up — ${dateLine}.`,
    "",
    `${featureTitle}. ${lede}`.trim(),
    ...(rest.length
      ? ["", "ALSO INSIDE", ...rest.map((c) => `  · ${headline(c.title)} — ${c.blurb}`)]
      : []),
    ...(audioLine ? ["", audioLine] : []),
    "",
    `Read this weekend's Ear: ${home}`,
    "",
    "You're getting this because you signed up at soknoear.com. Not for you? Just reply and I'll take you off the list. — Andy",
  ].join("\n");

  return { subject, html, text, hero, warnings };
}
