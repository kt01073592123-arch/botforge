# BotForge v3 — Sprint 5–8 (AI Design + Web Sites)

Bot egasi 30 sekundda professional dizaynli sayt + bot + web widget oladi.

## ✨ Sprint 5 — AI Design Generator

| Fayl | Nima qildi |
|---|---|
| `0020_design_kit.sql` | `design_kits`, `ai_assets`, `design_jobs` jadvallar + versioning |
| `lib/design/brand_generator.ts` | Claude → 8 ta rang, gradient, font pair, emoji, brand voice (luxury/playful/tech/...), mood keywords |
| `lib/design/copy_generator.ts` | Claude → hero headline/subheadline, USP (3-4), about text, 3 ta seed testimonial |
| `lib/design/image_generator.ts` | Pipeline: Replicate Flux Schnell → DALL-E 3 → Unsplash → Picsum (har bir keyingisi fallback). Vercel Blob'ga permanent yuklanadi. |
| `lib/design/orchestrator.ts` | 3 tasini parallel ishga tushiradi, design_jobs jadvalida kuzatadi |
| `api/bots/[id]/design/generate` | POST: AI generate, GET: aktiv kit |
| `app/bots/[id]/design/page.tsx` | Live preview UI (Desktop/Mobile toggle) |

**Narx:** ~$0.05 har generatsiya (Replicate $0.003 + Claude ~$0.015 + Unsplash bepul). Bot egasi qaytadan generatsiya qilib eng yoqqanini tanlaydi.

## 🧩 Sprint 6 — 5 ta Template + 10 ta Component

| Fayl | Nima |
|---|---|
| `components/design/primitives.tsx` | Reusable: HeroImage, HeroSplit, FeatureGrid, PricingTable, Gallery, Testimonials, Faq, CtaBanner, Stats, About, ContactBar, FontLoader, PageShell |
| `components/design/templates.tsx` | 5 ta to'liq template: ServiceTemplate, SalonTemplate, RestaurantTemplate, ShopTemplate, CourseTemplate + `renderTemplate()` router |
| `app/site/[username]/page.tsx` | Server-rendered public sayt (SEO-friendly, OG meta, dynamic template) |

Har template **bot.business_vertical** va **design_kit.template_id**'ga qarab tanlanadi:
- `restaurant` → menu, hours, reservation
- `salon` → services, gallery, booking
- `shop` → products grid, reviews
- `course` → modules, instructor, pricing
- `service` → universal (default)

Hammasi **server component** — Google'da yaxshi indekslanadi, page load <500ms.

## ✏️ Sprint 7 — Visual Editor + Custom Domain

| Fayl | Nima |
|---|---|
| `0021_pages_and_domains.sql` | `bot_pages` (block-based layout), `custom_domains`, `ab_tests` |
| `lib/page_editor.ts` | Default layout har vertical uchun, block validation, custom CSS sanitization |
| `lib/custom_domains.ts` | Domen ulash, DNS verify (CNAME), middleware lookup |
| `api/bots/[id]/page` | GET/PUT — block list saqlash |
| `api/bots/[id]/domains` | Domen qo'shish/verify/o'chirish |
| `app/bots/[id]/editor/page.tsx` | Visual editor: blocks ↑↓ ko'chiradi, mobile/desktop preview, custom CSS |

Bot egasi:
- Sahifa qismlarini drag emas, lekin **↑↓ tugmalar bilan** ko'chiradi (drag/drop keyingi versiyada)
- Iframe orqali real preview ko'radi
- Custom CSS yozadi (Pro tarif uchun)
- O'z domenini (`salonim.uz`) CNAME bilan ulaydi (white-label)

## 🌐 Sprint 8 — Web Widget

Bot egasi sayt'iga **1 qator script** qo'yadi → pastki o'ng burchakda chat tugmasi:

```html
<script src="https://botforge-beige.vercel.app/widget/<BOT_ID>/embed.js" async></script>
```

| Fayl | Nima |
|---|---|
| `api/widget/[id]/embed.js` | Self-hosted embed JS (FAB + iframe injector, brand ranglar bilan) |
| `app/widget/[id]/iframe/page.tsx` | Chat oynasi (matn, brand ranglar, mobile responsive) |
| `api/widget/[id]/chat` | POST — AI engine bilan suhbat (rate limited 20/min IP) |
| `api/widget/[id]/info` | Iframe yuklanganda kit + welcome message |
| `app/bots/[id]/widget/page.tsx` | Bot egasiga embed kodni copy/paste UI |

Web widget **Telegram'dan mustaqil** — bot egasi mijozlari Telegramga o'tmasdan to'g'ridan-to'g'ri saytdan AI bilan gaplashadi. Bir xil engine (multi-turn tools, customer memory, KB RAG) ishlaydi.

## 📦 Yangi env vars (ixtiyoriy, Vercel'ga qo'shing)

```bash
# AI image generation (eng arzon variant — Flux Schnell)
REPLICATE_API_TOKEN=r8_xxx          # https://replicate.com/account/api-tokens

# Stock photo fallback (bepul, 50 req/soat)
UNSPLASH_ACCESS_KEY=xxx             # https://unsplash.com/developers

# Generated rasmlar permanent storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx  # Vercel Storage → Create Blob Store
```

**Ularsiz nima bo'ladi?**
- `REPLICATE_API_TOKEN` yo'q → DALL-E 3 (OPENAI_API_KEY) yoki Unsplash, eng oxirgi placeholder SVG.
- `UNSPLASH_ACCESS_KEY` yo'q → Picsum (bepul, lekin generic).
- `BLOB_READ_WRITE_TOKEN` yo'q → rasmlar source URL'da qoladi (Replicate URL 24 soatdan keyin yo'qoladi!). Production'da albatta kerak.

## 🚀 Deploy ko'rsatmalar

```powershell
cd "C:\Users\ThinkPad\OneDrive\Desktop\builder bot"

# 1. Migration'lar (Neon SQL Editor'da)
# 0020_design_kit.sql + 0021_pages_and_domains.sql

# 2. Yangi env vars (ixtiyoriy)
npx vercel env add REPLICATE_API_TOKEN production
npx vercel env add BLOB_READ_WRITE_TOKEN production

# 3. Deploy
git add .
git commit -m "feat: BotForge v3 — AI Design Generator + 5 templates + Visual Editor + Web Widget"
npx vercel deploy --prod --yes
```

## 🎯 Foydalanish (bot egasi tajribasi)

1. **Bot yaratish** (eski oqim) → bot tayyor
2. **Design Studio** (`/app/bots/[id]/design`) → "✨ AI Generate" → 30 sekundda brand kit + hero rasm + matnlar
3. **Editor** (`/app/bots/[id]/editor`) → blocks tartibini moslashtirish, custom CSS
4. **Widget** (`/app/bots/[id]/widget`) → script kodini saytga yopishtirib chiqarish
5. **Custom domain** → o'z domenida sayt
6. **Public sayt** → `https://botforge-beige.vercel.app/site/<username>` (yangi) yoki `/b/<username>` (eski)
7. **Telegram bot** → ishlaydi, lekin **shu kit asosida** WebApp ham ochiladi

## 📊 Yakuniy Stack

```
┌─ Bot egasi (admin)
│  ├─ Dashboard: /app/bots/*
│  ├─ Design Studio: /app/bots/[id]/design
│  ├─ Editor: /app/bots/[id]/editor
│  └─ Widget: /app/bots/[id]/widget
│
├─ Public (mijoz)
│  ├─ Telegram bot (universal webhook + AI engine)
│  ├─ Public sayt: /site/[username] (yangi, AI design)
│  ├─ Public sayt: /b/[username] (eski landing)
│  ├─ WebApp: /c/[username] (cart, booking)
│  └─ Web widget: <script src=".../embed.js">
│
└─ AI engine (multi-turn tool loop)
   ├─ 8 ta tool: book, order, payment, KB, ...
   ├─ Customer memory (long-term)
   ├─ Voice (Whisper) + Vision (Claude)
   ├─ Bot Doctor (haftalik tahlil)
   └─ AI Design (brand + copy + image)
```

## Hisob-kitob xarajat

| Item | Narx |
|---|---|
| Bot suhbati (1000 xabar) | ~$0.50 (Claude Haiku) |
| AI Design generate | ~$0.05 har |
| Hero image (Replicate Flux) | $0.003 |
| Hero image (DALL-E 3) | $0.04 |
| Whisper voice (1 daq) | $0.006 |
| **Pro mijoz oylik o'rtacha** | **~$2-5 cost, narx 199-399k so'm** |

## Keyingi sprintlar (kelajakda)

- Sprint 9: Drip email/Telegram sequences (booking +24h reminder, post-purchase day 3)
- Sprint 10: Marketplace (template'lar va dizaynlar sotish)
- Sprint 11: Instagram DM + WhatsApp Business integratsiyasi
- Sprint 12: Drizzle ORM ga ko'chish + AI agentlar (autonomous bot)
