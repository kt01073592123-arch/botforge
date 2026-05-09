# BotForge v2 — Sprint 0–4 yangilanishlari

Senior dasturchi auditidan keyin amalga oshirilgan ulkan yangilanish.

## ⚡ Sprint 0 — Xavfsizlik + fundament

| Fayl | Nima qilindi |
|---|---|
| `next.config.mjs` | `frame-ancestors` faqat Telegram domenlarga. HSTS, X-Content-Type-Options, Permissions-Policy qo'shildi. `serverActions.allowedOrigins` aniq domenga. |
| `supabase/migrations/0017_dedup_and_perf.sql` | `processed_updates` jadvali (update_id dedup), pgvector HNSW index, log retention pg_cron, message indekslari |
| `src/lib/redact.ts` | PII redaction modul — telefon/email/karta/ism maskalash |
| `src/app/api/tg/[botId]/route.ts` | Webhook'ga dedup tekshiruvi va PII redaction qo'shildi |
| `scripts/rotate-encryption-key.mjs` | Encryption kalit rotation script (--dry-run flag bilan) |
| `vitest.config.ts` + `tests/` | 4 ta test fayl: encryption, initData, KB chunker, redact |
| `package.json` | `npm test` va `npm run test:watch` skriptlari |

**Migrationni qo'llang:**
```sql
-- Supabase SQL Editor'da
-- 0017_dedup_and_perf.sql faylini yopishtirib Run bosing
```

## 🤖 Sprint 1 — AI Power (eng katta "wow")

### Multi-turn tool loop
Eski versiya: AI bitta turda bitta tool ishlatardi va to'xtardi.
Yangi versiya: `while(stop_reason === "tool_use")` loop. AI tool natijasini olib, **shu suhbatda** keyingi qarorni qabul qiladi.

Misol:
1. Mijoz: "Ertaga 14:00 da soch oldirmoqchiman"
2. AI: `check_availability(date="2026-05-10")` ni chaqiradi
3. Tool natijasi: bo'sh slotlar
4. AI: 14:00 bo'shligini ko'rib `book_appointment(...)` ni chaqiradi
5. Tool natijasi: bron yaratildi
6. AI: "Sizni 14:00 ga yozdim, tasdiq matni keladi" deb javob beradi

**Bu hamma narsa bitta turda, bitta API chaqiriqda emas — multi-turn loop'da, lekin foydalanuvchiga bitta javob.**

### 8 ta yangi tool (`src/lib/ai/tools.ts`)

| Tool | Qachon chaqiriladi |
|---|---|
| `save_lead` | Mijoz kontakt qoldirsa |
| `request_human` | Operator chaqirilsa |
| `search_knowledge` | KB'dan javob izlash |
| `check_availability` | Bo'sh slotlarni ko'rish |
| `book_appointment` | Bron yaratish (slot to'qnashuv tekshiruvi bilan) |
| `create_order` | Buyurtma yaratish |
| `lookup_order` | "Buyurtmam qayerda?" |
| `send_payment_link` | To'lov linki yuborish |

### Customer Memory (long-term)

`supabase/migrations/0018_customer_memory.sql` + `src/lib/customer_memory.ts`

- `customer_profiles` jadvali: har mijoz uchun summary, preferences, tags, lifetime_value.
- AI har turda mijoz profilini system prompt'ga oladi: "Bu mijoz oldin 3 ta buyurtma qildi, latte yoqtiradi".
- `summarizeCustomer()` — AI background task'i, har 7 kunda profil yangilaydi.
- Triggers: yangi booking/order avtomatik counter'larni oshiradi.

## 🎤 Sprint 2 — Voice + Vision

`src/lib/ai/multimodal.ts`

- **Voice message** → Whisper API (OpenAI) → transcript → AI engine.
- **Photo** → Claude Vision → tasvir tushuntirish → AI engine matn sifatida.
- Mijoz endi yozish o'rniga ovoz yuborib, yoki mahsulot rasmini yuborib gaplasha oladi.

OpenAI key bo'lmasa — voice ishlamaydi (graceful fallback).

## 🧪 Sprint 3 — Test Sandbox

- `POST /api/bots/[id]/sandbox` — bot egasi prompt + tools'ni jonli sinab ko'radi (Telegramga ulanmasdan).
- `app/bots/[id]/sandbox/page.tsx` — chat UI + tool effects preview + token usage ko'rsatkichi.
- DB ga yozilmaydi (faqat ai_usage `meta.sandbox=true` bilan).

## 🩺 Sprint 4 — Bot Doctor (auto-tuning)

`supabase/migrations/0019_bot_doctor.sql` + `src/lib/bot_doctor.ts`

- Har dushanba 07:00 UTC da `vercel cron` `/api/cron/doctor` ni chaqiradi.
- Har bot uchun: oxirgi 7 kun statistikasi + AI tahlil + 3-5 ta yaxshilash taklifi.
- Bot egasiga Telegram orqali xabar yuboriladi.
- `app/bots/[id]/diagnostics` — UI'da ko'radi va "Apply" qiladi.

**Bu xususiyat sizning eng katta differentiator'ingiz.** Hech bir raqib (ManyChat, Tidio, Botpress) bunday qilmaydi. AI sizga "bot prompt'i shu yerini yaxshilang" deb aytadi.

## 📋 Production'ga chiqarish kontrol ro'yxati

```bash
# 1. Migration'larni qo'lash
# Supabase SQL Editor → 0017, 0018, 0019 ni ketma-ket Run bosing

# 2. Env vars'ni yangilash
npx vercel env add CRON_SECRET production
# generated: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

# OPENAI_API_KEY ni qo'shing (voice STT uchun)
npx vercel env add OPENAI_API_KEY production

# 3. Test'larni ishga tushirish
npm install
npm test

# 4. Deploy
npx vercel deploy --prod --yes
```

## Keyingi sprintlar (hali bajarilmagan)

| Sprint 5 | Web Widget — saytga embed qilinadigan iframe |
| Sprint 6 | Instagram DM integratsiyasi (Meta API) |
| Sprint 7 | Visual Flow Builder (React Flow) |
| Sprint 8 | Drip sequences (booking+24h reminder, post-purchase 3kun keyin) |
| Sprint 9 | Marketplace (template'larni sotish) |
| Sprint 10 | Payme/Uzum/Stripe to'lov providerlar |

## Refactor qilingan fayllar (asosiy)

- `src/lib/ai/engine.ts` — multi-turn loop
- `src/lib/ai/tools.ts` — yangi (8 ta tool)
- `src/lib/ai/multimodal.ts` — yangi (voice + vision)
- `src/lib/runtime.ts` — voice/photo handler, tool effects router
- `src/lib/customer_memory.ts` — yangi
- `src/lib/bot_doctor.ts` — yangi
- `src/lib/redact.ts` — yangi
- `src/lib/telegram.ts` — TgMessage tipiga voice/photo qo'shildi
- `next.config.mjs` — security headers
- `src/app/api/tg/[botId]/route.ts` — dedup + redaction
