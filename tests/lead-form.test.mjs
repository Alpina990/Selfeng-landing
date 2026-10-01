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

test("every buy button opens SelfEnguzbot directly", () => {
  assert.match(html, /telegramUrl:\s*"https:\/\/t\.me\/SelfEnguzbot"/);
  assert.doesNotMatch(html, /data-intent="buy"/);

  const buyControls = [...html.matchAll(/<(?:a|button)[^>]*>Sotib olish<\/[^>]+>/g)];
  assert.equal(buyControls.length, 2);
  for (const [control] of buyControls) {
    assert.match(control, /^<a\b/);
    assert.match(control, /data-tg/);
  }
});

test("video lead success embeds YouTube in the existing player", () => {
  assert.match(
    html,
    /youtubeEmbedUrl:\s*"https:\/\/www\.youtube\.com\/embed\/jkKgSbUv1E4"/,
  );
  assert.match(html, /function showIntroVideo\(\)/);
  assert.match(html, /isVideo[\s\S]*showIntroVideo\(\)[\s\S]*closeModal\(\)/);
  assert.match(html, /allow="autoplay; encrypted-media; picture-in-picture; fullscreen"/);
  assert.doesNotMatch(html, />Videoni ko‘rish<\/a>/);
});
