# BotForge — uyg‘ongandan keyin qiladigan ishlar

Hammasi tayyorlangan. Pastdagi 7 qadamni ketma-ket bajarsangiz platforma to‘liq ishlay boshlaydi. Taxminan 10–15 daqiqa.

---

## ✅ Hozirgacha bajarilgan

- Next.js 14 codebase tayyor (`src/`)
- 4 ta SQL migration tayyor (`supabase/migrations/`)
- Vercel’ga deploy qilindi → **https://botforge-beige.vercel.app**
- Vercel project: `botforge` (kt01073592123-archs-projects)

---

## 1) Supabase loyiha tanlash (eng birinchi)

Sizda 2 ta active free Supabase loyiha bor (`myauto`, `unvermarket`) va limit 2. Yangisini yaratish uchun bittani vaqtincha pauza qiling **yoki** mavjudini ishlating.

**Variant A — yangi loyiha (tavsiya etiladi):**
1. https://supabase.com/dashboard ga kiring
2. `unvermarket` yoki `myauto`’ni Settings → General → **Pause project** qiling (xohlasangiz keyin restore qilasiz)
3. Yangi loyiha yarating: nomi `botforge`, region `ap-northeast-1` (Tokyo)
4. Database parolini yozib oling

**Variant B — mavjud loyihaga qo‘shish:**
1. `unvermarket` yoki `myauto` ichida shu schema ishlatiladi (bot jadvallari `public` ostida bo‘ladi — boshqa ilovalaringizga xalaqit bermasligi uchun ehtiyot bo‘ling).

> Quyida “BotForge Supabase loyihasi” deyilsa, siz tanlagan loyiha tushuniladi.

---

## 2) Migration’larni qo‘llash

Supabase Dashboard → SQL Editor’da quyidagi 4 ta faylni **shu tartibda** yopishtirib, har birini ishga tushiring:

1. `supabase/migrations/0001_init.sql` — schema
2. `supabase/migrations/0002_rls.sql` — RLS policies
3. `supabase/migrations/0003_seed_templates.sql` — 3 ta template
4. `supabase/migrations/0004_rpc.sql` — RPC funksiyalari

Tekshirish uchun: **Database → Tables**’da `bots`, `bot_templates`, `conversations`, `messages` va boshqalar ko‘rinishi kerak.

---

## 3) Platforma uchun Telegram bot yaratish

Bu bot **WebApp loginini** ushlab turadi va `/app` sahifasini ochadi. Mijoz botlari emas — sizning platformangizning kirish nuqtasi.

1. Telegramda [@BotFather](https://t.me/BotFather) ga `/newbot`
2. Nomi: `BotForge` (yoki yoqtirgan), username: `botforge_uz_bot` (`_bot` bilan tugashi shart)
3. Tokenni nusxalang
4. BotFather’da yana shu botga: `/setmenubutton`
5. Bot tanlang → URL: `https://botforge-beige.vercel.app/app` → tugma matni: `🚀 Bot yaratish`
6. (Ixtiyoriy) `/setdomain` → `botforge-beige.vercel.app`

---

## 4) OpenAI API key

1. https://platform.openai.com/api-keys ga kiring
2. **Create new secret key** → nomini `botforge` qo‘ying
3. Kalitni nusxalang (sk-... bilan boshlanadi)
4. Billing kartani ulang ($5–10 yetadi avval)

> Alternativa: `gpt-4o-mini` arzon (taxminan 0.15$/1M input). Boshlanish uchun ideal.

---

## 5) Vercel env vars qo‘shish

PowerShell ochib loyiha ichida:

```powershell
cd "c:\Users\ThinkPad\OneDrive\Desktop\builder bot"

# Supabase (Dashboard → Settings → API'dan oling)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# https://<projectref>.supabase.co  →  yopishtiring va Enter

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# anon public key  →  yopishtiring

npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# service_role secret key  →  yopishtiring

# Telegram (3-bosqichdagi platforma boti)
npx vercel env add TELEGRAM_BOT_TOKEN production
# 123456:AA...  →  yopishtiring

npx vercel env add NEXT_PUBLIC_TELEGRAM_BOT_USERNAME production
# botforge_uz_bot  →  yopishtiring

# OpenAI
npx vercel env add OPENAI_API_KEY production
# sk-...

npx vercel env add AI_MODEL production
# gpt-4o-mini

# Encryption (32 byte hex). Tayyor kalit:
npx vercel env add ENCRYPTION_KEY production
# f5c10c87407649b3ecf6f509979d70af051d2f683c4ca1140c6b628d7df1afa2

# Webhook
npx vercel env add WEBHOOK_SECRET production
# 14995d4ef89fbfd217b3c8c00ea2b607182b0aa99c21e908

npx vercel env add WEBHOOK_BASE_URL production
# https://botforge-beige.vercel.app

npx vercel env add NEXT_PUBLIC_APP_URL production
# https://botforge-beige.vercel.app
```

> **Eslatma:** Yuqoridagi `ENCRYPTION_KEY` va `WEBHOOK_SECRET` siz uchun yangilab generatsiya qilingan. Boshqasini ham qo‘yishingiz mumkin: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 6) Qayta deploy

Env vars qo‘shgandan keyin:

```powershell
npx vercel deploy --prod --yes
```

Bu yangi env bilan production build qilib qo‘yadi.

---

## 7) Sinov

1. Telegramda o‘zingizning `botforge_uz_bot` ga kiring
2. Menyudagi **🚀 Bot yaratish** tugmasini bosing
3. WebApp ochiladi → bot turini tanlang → BotFather’dan boshqa tokenli **alohida** test bot yarating
4. Tokenni qo‘ying → ulansa, `Botni faollashtirish` ni bosing
5. Test botingizga `/start` yuboring → AI javob beradi 🎉

---

## Loyiha strukturasi

```
src/
  app/
    api/                 # API routes
      auth/telegram      # WebApp login
      bots/              # CRUD
      bots/[id]/token    # token ulash
      bots/[id]/activate # webhook o‘rnatish
      tg/[botId]         # Telegram webhook (universal)
    app/                 # Dashboard (TG WebApp ichida)
      bots               # ro‘yxat
      bots/new           # wizard
      bots/[id]          # overview + stats
      bots/[id]/connect  # token ulash sahifasi
      bots/[id]/services # xizmatlar/narxlar/FAQ
      bots/[id]/conversations  # suhbatlar
      bots/[id]/leads    # leadlar
      bots/[id]/settings # AI prompt va h.k.
    page.tsx             # landing
  lib/
    env.ts               # env validation
    encryption.ts        # AES-256-GCM
    auth.ts              # JWT cookie session
    telegram.ts          # initData verify + Bot API
    bots.ts              # CRUD helpers
    runtime.ts           # Telegram update handler
    ai/openai.ts
    ai/engine.ts         # tool-calling LLM engine
    supabase/
      admin.ts           # service-role klient
      types.ts
supabase/migrations/     # SQL fayllar (1, 2, 3, 4)
```

---

## Keyingi qadamlar (MVP 2 dan)

- [ ] Knowledge base (PDF/DOCX yuklash + RAG)
- [ ] Broadcast jo‘natish
- [ ] Tariflar va to‘lov (Stripe yoki Click)
- [ ] CRM ko‘rinishi
- [ ] Operator chat (admin webapp ichidan to‘g‘ridan to‘g‘ri javob beradi)
- [ ] Visual flow builder
- [ ] Rest. + Salon + Auto + Course template’lar
- [ ] Marketplace

---

## Xavfsizlik eslatmalari

- ✅ Tokenlar AES-256-GCM bilan shifrlangan, ochiq saqlanmaydi
- ✅ Webhook har bir bot uchun unikal `secret_token` bilan tekshiriladi
- ✅ RLS yoqilgan, har user faqat o‘z botlarini ko‘radi
- ⚠️ AI cost limit qo‘yilgan (`monthly_message_limit = 500` default), abuse oldini olish uchun
- ⚠️ Rate limit hozir yo‘q — production’dan oldin Vercel WAF yoki Upstash Ratelimit qo‘shing
- ⚠️ Webhook payloadi log’ga yoziladi — production’da personal ma’lumotlarni mask qiling

---

## Muammo bo‘lsa

- **Build xato:** `npx vercel logs <deployment-url>` — env yetishmasa shu yerda chiqadi
- **Bot javob bermayapti:** Vercel dashboard → Functions → `/api/tg/[botId]` log’larini ko‘ring
- **WebApp ochilmayapti:** `NEXT_PUBLIC_APP_URL` to‘g‘ri va `https://` bilan boshlanishi shart
- **Token ulanmayapti:** BotFather’dan **boshqa** bot tokenini ulang (platforma bot tokenini emas!)
