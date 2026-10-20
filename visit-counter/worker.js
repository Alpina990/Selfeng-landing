// SelfEng visit counter — Cloudflare Worker + D1.
// POST /hit {vid}   -> landing sahifa ochilganda bitta yozuv
// GET  /stats?token -> kunma-kun va o'rtacha tashriflar (HTML), /stats.json?token -> JSON

const DEFAULT_ORIGIN = "https://selfeng.uz";
const TZ_OFFSET_MS = 5 * 3600 * 1000; // Asia/Tashkent (UTC+5, DST yo'q)
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i;
const DAY_MS = 86400000;

export function tashkentDay(ms) {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

// rows: [{day, views, uniques}] (faqat tashrif bo'lgan kunlar)
export function buildStats(rows, nowMs, windowDays = 7) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const today = tashkentDay(nowMs);
  const last = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = tashkentDay(nowMs - i * DAY_MS);
    const r = byDay.get(day);
    last.push({ day, views: r ? r.views : 0, uniques: r ? r.uniques : 0 });
  }
  const first = rows.length ? rows.map((r) => r.day).sort()[0] : today;
  const days = Math.max(1, Math.round((Date.parse(today) - Date.parse(first)) / DAY_MS) + 1);
  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalUniques = rows.reduce((s, r) => s + r.uniques, 0); // kunlik unikal yig'indisi
  return {
    last,
    since: first,
    days,
    totalViews,
    avgViews: totalViews / days,
    avgUniques: totalUniques / days,
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

export function renderPage(s) {
  const max = Math.max(1, ...s.last.map((d) => d.views));
  const rows = s.last
    .map((d) => `<tr><td>${esc(d.day)}</td><td>${d.uniques}</td><td>${d.views}</td><td><div class="bar" style="width:${Math.round((d.views / max) * 100)}%"></div></td></tr>`)
    .join("");
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SelfEng tashriflar</title>
<style>body{font:16px system-ui,sans-serif;margin:0;padding:24px 16px;background:#f7f7f9;color:#1b1b1f}main{max-width:640px;margin:auto}h1{font-size:22px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #eee}th{font-size:13px;color:#666}.bar{height:10px;background:#4f46e5;border-radius:5px;min-width:2px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.card{background:#fff;border-radius:12px;padding:14px}.card b{display:block;font-size:26px}.card span{font-size:13px;color:#666}@media(prefers-color-scheme:dark){body{background:#111114;color:#eee}table,.card{background:#1c1c21}th,td{border-color:#2a2a31}th,.card span{color:#aaa}}</style></head><body><main>
<h1>SelfEng landing — tashriflar</h1>
<table><thead><tr><th>Kun</th><th>Odam</th><th>Ochilish</th><th></th></tr></thead><tbody>${rows}</tbody></table>
<div class="cards"><div class="card"><b>${fmt(s.avgUniques)}</b><span>kuniga o'rtacha odam</span></div><div class="card"><b>${fmt(s.avgViews)}</b><span>kuniga o'rtacha ochilish</span></div></div>
<p style="font-size:13px;color:#888">${esc(s.since)} dan beri, ${s.days} kun, jami ${s.totalViews} ochilish. "Odam" — brauzer bo'yicha kunlik noyob tashrif.</p>
</main></body></html>`;
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

async function loadRows(env) {
  const { results } = await env.DB.prepare(
    "SELECT day, COUNT(*) AS views, COUNT(DISTINCT vid) AS uniques FROM hits GROUP BY day",
  ).all();
  return results;
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

    if (request.method === "POST" && url.pathname === "/hit") {
      const h = cors(origin);
      if (BOT_RE.test(request.headers.get("User-Agent") || "")) return new Response(null, { status: 204, headers: h });
      let body;
      try {
        body = JSON.parse(await request.text());
      } catch {
        return new Response(null, { status: 400, headers: h });
      }
      const vid = String((body && body.vid) || "");
      if (!/^[A-Za-z0-9-]{8,64}$/.test(vid)) return new Response(null, { status: 400, headers: h });
      const now = Date.now();
      await env.DB.prepare("INSERT INTO hits (day, vid, ts) VALUES (?, ?, ?)").bind(tashkentDay(now), vid, now).run();
      return new Response(null, { status: 204, headers: h });
    }

    if (request.method === "GET" && (url.pathname === "/stats" || url.pathname === "/stats.json")) {
      const token = (env.STATS_TOKEN || "").trim();
      if (!token || url.searchParams.get("token") !== token) return new Response("Not found", { status: 404 });
      const stats = buildStats(await loadRows(env), Date.now());
      if (url.pathname === "/stats.json") {
        return new Response(JSON.stringify(stats), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
      return new Response(renderPage(stats), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }

    return new Response("Not found", { status: 404 });
  },
};
