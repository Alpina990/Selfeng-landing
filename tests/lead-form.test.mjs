import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("lead forms post to the production CRM bridge", () => {
  assert.match(
    html,
    /leadEndpoint:\s*"https:\/\/z993jvdj4xcjn1qi26dgy2i2\.5\.9\.149\.59\.sslip\.io\/landing-leads"/,
  );
  assert.match(html, /submissionId:\s*crypto\.randomUUID\(\)/);
  assert.match(html, /name="website"/);
  assert.match(html, /website:\s*form\.elements\.website\.value/);
});

test("every free-lesson button requests the Telegram app directly", () => {
  assert.match(html, /telegramUrl:\s*"tg:\/\/resolve\?domain=SelfEnguzbot&start=web"/);
  assert.doesNotMatch(html, /data-intent="buy"/);

  const ctaControls = [...html.matchAll(/<(?:a|button)[^>]*>Bepul dars<\/[^>]+>/g)];
  assert.equal(ctaControls.length, 2);
  for (const [control] of ctaControls) {
    assert.match(control, /^<a\b/);
    assert.match(control, /data-tg/);
  }
});

test("modal Telegram button opens the SelfEng support chat", () => {
  assert.match(html, /supportUrl:\s*"https:\/\/t\.me\/selfengsupport"/);
  assert.match(
    html,
    /<a class="b alt" data-tg="support" href="https:\/\/t\.me\/selfengsupport"[^>]*>Telegram<\/a>/,
  );
});

test("video click embeds YouTube without collecting contact information", () => {
  assert.match(html, /<span class="time">0:00 \/ 6:00<\/span>/);
  assert.doesNotMatch(html, /<span class="time">0:00 \/ 4:00<\/span>/);
  assert.match(
    html,
    /youtubeEmbedUrl:\s*"https:\/\/www\.youtube\.com\/embed\/jkKgSbUv1E4"/,
  );
  assert.match(html, /function showIntroVideo\(\)/);
  assert.match(html, /data-play-video/);
  assert.match(html, /\$\$\("\[data-play-video\]"\)\.forEach\(button => button\.addEventListener\("click", showIntroVideo\)\)/);
  assert.doesNotMatch(html, /data-open="video"/);
  assert.doesNotMatch(html, /modal-video/);
  assert.doesNotMatch(html, /class="vtag"|\.v3 \.vtag/);
  assert.match(html, /class="play"/);
  assert.match(html, /allow="autoplay; encrypted-media; picture-in-picture; fullscreen"/);
  assert.doesNotMatch(html, />Videoni ko‘rish<\/a>/);
});

test("Meta Pixel tracks page views with the configured pixel ID", () => {
  assert.match(html, /connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(html, /fbq\('init', '2148920235703445'\)/);
  assert.match(html, /fbq\('track', 'PageView'\)/);
  assert.match(
    html,
    /facebook\.com\/tr\?id=2148920235703445&amp;ev=PageView&amp;noscript=1/,
  );
  assert.doesNotMatch(html, /@url:/);
});

test("successful lead submission tracks a Meta Pixel Lead event", () => {
  const okCheck = html.indexOf('if (!res.ok) throw new Error("HTTP " + res.status);');
  const leadEvent = html.indexOf('fbq("track", "Lead")');

  assert.ok(okCheck > -1, "the form must still wait for a successful CRM response");
  assert.ok(leadEvent > okCheck, "the Lead event must fire only after the CRM accepts the lead");
});
