# BotForge — Neon’ga ko‘chirilgandan keyin

Loyihaning DB tomoni Supabase’dan **Neon**’ga ko‘chirildi. Auth, RLS, RPC, pgvector — hammasi ishlaydi. RLS o‘rniga server-side ownership check.

> **Eski hujjat** (Supabase): [SETUP.md](./SETUP.md) — endi mos kelmaydi, lekin umumiy strukturani tushuntiradi.

---

## ✅ Hozir tayyor

- Neon Postgres uchun mos minimal `postgres` kutubxonasi orqali shim
- 11 ta migration → Neon’ga moslangan
- Vercel deployed: **https://botforge-beige.vercel.app**
- pgvector, pg_cron (Neon Pro tarifda) qo‘llab-quvvatlash kerak — biz pg_cron’dan voz kechib Vercel Cron + maintenance endpoint’ga o‘tdik

---

## 1) Neon loyiha yaratish

1. https://neon.tech ga kiring (Google/GitHub bilan)
2. **Create project**:
   - Name: `botforge`
   - Postgres version: 17
   - Region: `Asia Pacific (Singapore)` yoki `EU Frankfurt` (sizga yaqinroqi)
3. Project yaratilgach, Dashboard → **Connection Details** ostidan **Pooled connection** stringini ko‘chiring
4. Format: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`

> Free tier: 10 ta project, 0.5 GB storage, 100 hisoblash soati. BotForge MVP uchun yetarli.

---

## 2) Extensionlarni yoqish

Neon Console → **SQL Editor**’da quyidagi 2 ta query’ni alohida ishga tushiring:

```sql
create extension if not exists vector;
create extension if not exists pg_trgm;
```

> `pg_cron` Neon’ning Free tarifida yo‘q. Vercel Cron + cron-job.org bilan yechilgan (5-bosqichda).

---

## 3) Migrationlarni qo‘llash

Neon SQL Editor’da quyidagilarni **shu tartibda** yopishtirib, har birini ishga tushiring:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql` *(faqat stub funksiya)*
3. `supabase/migrations/0003_seed_templates.sql`
4. `supabase/migrations/0004_rpc.sql`
5. `supabase/migrations/0005_rate_limit.sql`
6. `supabase/migrations/0006_monthly_reset.sql`
7. `supabase/migrations/0007_knowledge.sql`
8. `supabase/migrations/0008_billing.sql`
9. `supabase/migrations/0009_broadcast.sql`
10. `supabase/migrations/0010_analytics.sql`

> Tekshirish: Neon **Tables** sahifasida 15+ ta jadval (bots, conversations, leads, kb_chunks, plans va h.k.) ko‘rinishi kerak.

---

## 4) Vercel env vars

```powershell
cd "c:\Users\ThinkPad\OneDrive\Desktop\builder bot"

# Neon connection string (1-bosqichdagi pooled connection)
npx vercel env add DATABASE_URL production
# postgresql://...

# Telegram platforma boti (BotFather → /newbot)
npx vercel env add TELEGRAM_BOT_TOKEN production
npx vercel env add NEXT_PUBLIC_TELEGRAM_BOT_USERNAME production

# OpenAI
npx vercel env add OPENAI_API_KEY production
npx vercel env add AI_MODEL production
# gpt-4o-mini

# Encryption (32 bayt hex)
npx vercel env add ENCRYPTION_KEY production
# f5c10c87407649b3ecf6f509979d70af051d2f683c4ca1140c6b628d7df1afa2

# Webhook
npx vercel env add WEBHOOK_SECRET production
# 14995d4ef89fbfd217b3c8c00ea2b607182b0aa99c21e908
npx vercel env add WEBHOOK_BASE_URL production
# https://botforge-beige.vercel.app
npx vercel env add NEXT_PUBLIC_APP_URL production
# https://botforge-beige.vercel.app

# Cron secret (cron-job.org va Vercel Cron uchun)
npx vercel env add CRON_SECRET production
# yangidan yarating: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Eski Supabase env’larni olib tashlash (ixtiyoriy):
```powershell
npx vercel env rm NEXT_PUBLIC_SUPABASE_URL production
npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env rm SUPABASE_SERVICE_ROLE_KEY production
```

So‘ng:
```powershell
npx vercel deploy --prod --yes
```

---

## 5) Cron sozlash

Vercel Hobby plan’i kuniga 1 marta cron qo‘shadi. Bu broadcast uchun yetarli emas. Ikki yo‘l:

### A. Free yo‘l — cron-job.org

1. https://cron-job.org da ro‘yxatdan o‘ting (bepul, kartasiz)
2. **Create cronjob**:
   - URL: `https://botforge-beige.vercel.app/api/cron/broadcast`
   - Schedule: **Every minute**
   - HTTP method: GET
   - Headers: `Authorization: Bearer <CRON_SECRET>`
3. Save → ishga tushadi

Vercel’ning kunlik cron’i `/api/cron/maintenance`’ga o‘rnatilgan — u rate limit tozalash va oylik reset’ni qiladi.

### B. Pro yo‘l — Vercel Pro ($20/oy)

`vercel.json`’da daqiqali schedule yozasiz. Lekin Vercel function bandwidth ham yeydi.

---

## 6) Tekshirish

```bash
curl https://botforge-beige.vercel.app/api/templates
```

Javob: `{"templates":[{"id":"beauty_manager",...},...]}` bo‘lishi kerak. Agar 500 qaytarsa — DATABASE_URL noto‘g‘ri yoki migrationlar ishlamagan.

---

## Supabase’dan farqlar

| Narsa | Supabase | Neon (hozir) |
|---|---|---|
| Auth | `auth.users` jadvali bor | Custom (Telegram WebApp + JWT cookie) |
| RLS | Yoqilgan | O‘chirilgan, ownership server-side |
| Storage | Bor | Yo‘q (kerak emas) |
| Realtime | Bor | Yo‘q (kerak emas) |
| Service role key | Bor | Yo‘q — connection string yetadi |
| pg_cron | Bor | Pro tarifda; Vercel Cron + cron-job.org ishlatamiz |
| pg_net | Bor | Yo‘q |
| pgvector | Bor | Bor ✅ |
| 2 active project limit | Bor 😞 | 10 ta project ✅ |

---

## Kelajakda Drizzle ORM ga o‘tish

Hozirgi kod minimal SQL shim ishlatadi. Type safety to‘la emas (`any` ishlatilgan). Production scale uchun keyingi qadam — [Drizzle ORM](https://orm.drizzle.team) ga o‘tish:

- Schema TypeScript’da
- Generated types
- Migrations CLI orqali
- Neon adapter rasmiy

Migration vaqti: ~1 kun. Hozir kerak emas.

---

## Eslatma

- Eski Supabase Vercel env’larni o‘chirib qo‘ying
- `myauto` va `unvermarket` Supabase loyihalaringizga BotForge tegmagan
- Eski Supabase `tfmlchotqrcfidqqojcs` (inactive) loyihasi kerak emas — istasangiz o‘chirib tashlang
