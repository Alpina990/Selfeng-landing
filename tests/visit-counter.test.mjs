import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker, { buildStats, tashkentDay } from "../visit-counter/worker.js";

const NOW = Date.parse("2026-10-20T10:00:00Z");

test("tashkentDay uses UTC+5", () => {
  assert.equal(tashkentDay(Date.parse("2026-10-20T20:00:00Z")), "2026-10-21");
});

test("buildStats lists 7 days with zeros and averages over all days since first hit", () => {
  const s = buildStats(
    [
      { day: "2026-10-18", views: 10, uniques: 8 },
      { day: "2026-10-20", views: 20, uniques: 12 },
    ],
    NOW,
  );
  assert.equal(s.last.length, 7);
  assert.deepEqual(s.last[6], { day: "2026-10-20", views: 20, uniques: 12 });
  assert.deepEqual(s.last[5], { day: "2026-10-19", views: 0, uniques: 0 });
  assert.equal(s.days, 3);
  assert.equal(s.avgViews, 10);
  assert.equal(s.avgUniques, 20 / 3);
});

test("worker records hits, rejects bots/bad ids, protects stats", async () => {
  const inserted = [];
  const env = {
    STATS_TOKEN: "secret",
    DB: {
      prepare: () => ({
        bind: (...a) => ({ run: async () => inserted.push(a) }),
        all: async () => ({ results: [{ day: tashkentDay(Date.now()), views: 3, uniques: 2 }] }),
      }),
    },
  };
  const hit = (vid, ua = "Mozilla/5.0") =>
    worker.fetch(new Request("https://x/hit", { method: "POST", headers: { "User-Agent": ua }, body: JSON.stringify({ vid }) }), env);
  assert.equal((await hit("abcdefgh-1234")).status, 204);
  assert.equal(inserted.length, 1);
  await hit("abcdefgh-1234", "Googlebot/2.1");
  assert.equal(inserted.length, 1);
  assert.equal((await hit("bad id!")).status, 400);
  assert.equal((await worker.fetch(new Request("https://x/stats"), env)).status, 404);
  const ok = await worker.fetch(new Request("https://x/stats?token=secret"), env);
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /kuniga o'rtacha odam/);
});

test("landing sends one anonymous beacon per session when endpoint is set", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /visitEndpoint:/);
  assert.match(html, /sendBeacon\(CONFIG\.visitEndpoint/);
});
