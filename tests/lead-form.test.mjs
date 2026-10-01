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
