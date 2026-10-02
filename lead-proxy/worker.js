// SelfEng lead-proxy — Cloudflare Worker.
// Brauzer (selfeng.uz) -> Worker -> BeeCRM. API kalit faqat Worker'da (secret),
// brauzerda hech qachon ko'rinmaydi.
//
// Deploy: lead-proxy/README.md ga qarang.
// Sirlar: wrangler secret put BEECRM_API_KEY  (kodga kalit yozmang!)

const BEECRM_URL = "https://api.beecrm.uz/api/integrations/v1/leads/";
const DEFAULT_ORIGIN = "https://selfeng.uz";

// BeeCRM kalitni qanday qabul qiladi: "bearer" (Authorization: Bearer KEY)
// Agar CRM misolida boshqa usul ko'rsatilsa, wrangler secret put BEECRM_AUTH_STYLE
// qiymatini "x-api-key" yoki "body" qilib o'zgartiring (kodni qayta yozish shart emas).
function authHeaders(apiKey, style) {
  if (style === "x-api-key") return { "X-API-Key": apiKey };
  return { Authorization: "Bearer " + apiKey };
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || (url.pathname !== "/" && url.pathname !== "/lead")) {
      return json({ ok: false, error: "Not found" }, 404, cors);
    }

    const apiKey = (env.BEECRM_API_KEY || "").trim();
    if (!apiKey) {
      return json({ ok: false, error: "Server sozlanmagan (API kalit yo'q)" }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Noto'g'ri so'rov" }, 400, cors);
    }

    const name = String(body.name || "").trim();
    const digits = String(body.phone || "").replace(/\D/g, "").replace(/^998(?=\d{9}$)/, "");
    if (name.length < 2 || digits.length !== 9) {
      return json({ ok: false, error: "Ism yoki telefon noto'g'ri" }, 400, cors);
    }
    const phone = "+998" + digits;

    // BeeCRM'ga yuboriladigan maydonlar. Agar CRM boshqa nom talab qilsa
    // (masalan full_name), shu joyni o'zgartiring.
    const payload = {
      name,
      phone,
      source: String(body.source || "selfeng.uz"),
      comment: "Sahifa: " + String(body.page || "selfeng"),
    };
    const style = (env.BEECRM_AUTH_STYLE || "bearer").trim().toLowerCase();
    const headers = { "Content-Type": "application/json", ...authHeaders(apiKey, style) };
    const forward = style === "body" ? { ...payload, api_key: apiKey } : payload;

    let upstream;
    try {
      upstream = await fetch(BEECRM_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(forward),
      });
    } catch {
      return json({ ok: false, error: "CRM'ga ulanib bo'lmadi" }, 502, cors);
    }

    if (!upstream.ok) {
      return json({ ok: false, error: "CRM qabul qilmadi (HTTP " + upstream.status + ")" }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};
