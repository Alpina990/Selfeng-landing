import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("lead forms post to the production CRM bridge", () => {
  assert.match(
    html,
    /leadEndpoint:\s*"https:\/\/selfeng\.uz\/landing-leads\/landing-leads"/,
  );
  assert.doesNotMatch(html, /sslip\.io\/landing-leads/);
  assert.match(html, /submissionId:\s*crypto\.randomUUID\(\)/);
  assert.match(html, /name="website"/);
  assert.match(html, /website:\s*form\.elements\.website\.value/);
});

test("free-lesson buttons open the form and a saved lead opens the bot's t.me page", () => {
  assert.match(html, /telegramUrl:\s*"https:\/\/t\.me\/SelfEnguzbot\?start=web"/);
  assert.doesNotMatch(html, /tg:\/\/resolve\?domain=SelfEnguzbot/);
  assert.doesNotMatch(html, /data-intent="buy"/);

  const openers = [...html.matchAll(/<button[^>]*data-open-free[^>]*>BEPUL DARS<\/button>/g)];
  assert.equal(openers.length, 2);
  assert.doesNotMatch(html, /<a[^>]*>BEPUL DARS<\/a>/);
  assert.doesNotMatch(html, /bd-success|bd-bot|bd-sent/);

  const okCheck = html.indexOf('if (!res.ok) throw new Error("HTTP " + res.status);', html.indexOf('source: "modal-free"'));
  const redirect = html.indexOf("window.location.href = CONFIG.telegramUrl;");
  assert.ok(okCheck > -1 && redirect > okCheck, "the redirect happens only after the CRM accepted the lead");
});

test("the free-lesson form posts source modal-free; Ma’lumot olish keeps its own source", () => {
  assert.match(html, /source:\s*"modal-free"/);
  assert.match(html, /<button class="b" type="submit" data-intent="info">Ma’lumot olish<\/button>/);
  assert.match(html, /form\.dataset\.source = "form-" \+ btn\.dataset\.intent/);
});

test("the free-lesson form shows a small invalid-phone hint between the phone field and the button", () => {
  const phone = html.indexOf('id="bdfPhone"');
  const hint = html.indexOf("Iltimos, to‘g‘ri raqam kiriting");
  const submit = html.indexOf('id="bdSubmit"');
  assert.ok(phone > -1 && hint > phone && submit > hint);
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
