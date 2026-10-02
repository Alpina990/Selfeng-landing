# Lead-proxy: selfeng.uz → BeeCRM (Cloudflare Worker, bepul)

Brauzerdan kelgan ism+telefon shu Worker orqali BeeCRM'ga tushadi.
API kalit Worker sirida saqlanadi — sayt kodida ko'rinmaydi.

## 1-qadam: Cloudflare akkaunt (bir marta)

1. https://dash.cloudflare.com/sign-up — bepul ro'yxatdan o'ting.
2. Kompyuterda terminalni ochib:
   ```
   npm install -g wrangler
   wrangler login
   ```
   (brauzerda Cloudflare'ga ruxsat berish so'raladi — Allow bosing)

## 2-qadam: Deploy

```bash
cd lead-proxy
wrangler deploy
```

Natijada manzil chiqadi, masalan:
`https://selfeng-lead-proxy.YOUR-NAME.workers.dev`

## 3-qadam: API kalitni qo'yish (muhim)

Kalit kodga yozilmaydi — sir sifatida saqlanadi:

```bash
wrangler secret put BEECRM_API_KEY
```

So'ralganda BeeCRM bergan **ulanish kaliti**ni joylashtiring.

Agar BeeCRM misolida kalit `Authorization: Bearer` emas, boshqa usulda
yuborilsa:

```bash
wrangler secret put BEECRM_AUTH_STYLE
```

Qiymat: `x-api-key` yoki `body` (standart: `bearer`).

## 4-qadam: Saytni ulash

`index.html` ichida `CONFIG.leadEndpoint` ga Worker manzilini yozing:

```js
leadEndpoint: "https://selfeng-lead-proxy.YOUR-NAME.workers.dev/lead",
```

Saytni GitHub'ga push qiling (Pages avtomatik yangilanadi).

## 5-qadam: Tekshirish

1. selfeng.uz saytida test ism + raqam qoldiring.
2. BeeCRM'da yangi lead tushganini tekshiring.
3. Ishlamasa: `wrangler tail` buyrug'i bilan jonli log'ni ko'ring.

## Xavfsizlik eslatmalari

- `BEECRM_API_KEY` ni hech qachon git'ga, chatga yoki sayt kodiga yozmang.
- Spamdan himoya uchun keyinroq tezlik chegarasi (rate limit) qo'shish mumkin.
