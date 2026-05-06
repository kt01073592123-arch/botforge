# BotForge

**5 daqiqada AI manager Telegram bot yaratuvchi platforma.** Salon, kosmetika, do‘kon, support va lead capture biznes uchun.

> Setup uchun → [SETUP.md](./SETUP.md)

## Stack

- **Next.js 14** (App Router) on Vercel
- **Supabase** (Postgres + RLS + service role)
- **OpenAI** (gpt-4o-mini default, tool calls)
- **Telegram WebApp** initData auth
- **AES-256-GCM** token encryption

## Quick start (local dev)

```bash
npm install
cp .env.example .env.local
# .env.local ni to‘ldiring (SETUP.md bo‘yicha)
npm run dev
```

## Tushunchalar

- Foydalanuvchi BotFather’dan bot oladi (chunki Bot API o‘zi yangi bot tokenini bera olmaydi).
- Tokenni BotForge ichida shifrlangan ko‘rinishda saqlaymiz.
- Bitta universal webhook (`/api/tg/[botId]`) hamma botlarni ishlatadi.
- AI Engine `save_lead` va `request_human` toollari bilan ishlaydi.

## License

MIT — siz uchun, o‘z biznesingiz uchun ishlating.
