# BotForge v4 — Sprint 9: AI Prompt → Bot + Sayt

Bot egasi 1-2 jumlada biznesini tasvirlaydi → 30 sekundda **bot + sayt + brand**ning hammasini AI tayyorlaydi.

## ✨ Sprint 9 — BeautyShop sklet + Prompt-driven generator

### Asosiy g'oya

Avval `bot_templates` jadvalida 3-5 ta tayyor pack bor edi. Endi qo'shildi:

1. **BeautyShop "namuna skelet"** (real ishlovchi Seoul Beauty Shop pattern'idan ilhomlangan): kosmetika do'koni + Telegram Mini App + AI kosmetolog-maslahatchi + referral cashback + admin photo upload.
2. **AI prompt-driven generator**: bot egasi tabiiy tilda biznesini tasvirlaydi → Claude BeautyShop sklet qoidalarini bilib turgan holda yangi biznesga moslangan to'liq config qaytaradi.

### Yangi/o'zgartirilgan fayllar

| Fayl | Nima qildi |
|---|---|
| `0023_beautyshop_pack.sql` | `shop_beauty_seoul` pack'ni `bot_templates`'ga seed qiladi (4 ta sub-type, 3 ta narx tier, 3 ta ohang, brand kit, 6 ta default mahsulot, 6 ta FAQ, 3 ta broadcast, working hours). `ai_generated_configs` jadvali — Claude generatsiyalarini token+narx bilan kuzatish uchun. |
| `lib/ai/bot_generator.ts` | Claude orqali tabiiy tildagi promtdan to'liq bot config (welcome, system_prompt, buttons, services, faq, brand_kit, working_hours, contacts, broadcasts) generatsiya qiladi. To'liq validatsiya (hex rang, vertical enum, working hours format), fallback config, cost tracking. |
| `api/templates/from-prompt/route.ts` | 2 rejimli endpoint: `create:false` faqat preview qaytaradi, `create:true` botni darhol DB'ga yozadi va `ai_generated_configs`'ga log yozadi. Bot yaratilgandan so'ng `generateDesignKit()` (brand+copy+hero rasm) va `ensureDefaultPage()` (block layout) **fonda** ishga tushadi — javob 3-5 sekundda qaytadi, sayt 30 sekundda tayyor. |
| `app/bots/new/from-prompt/page.tsx` | UI: textarea (2000 belgi), bot/biznes nomi, 6 ta vertical chip (auto / shop / salon / restoran / kurs / xizmat), 4 ta tezkor namuna (kosmetika / pitsa / salon / kurs). Live preview: brand kit, tugmalar, mahsulotlar (narx bilan), FAQ (accordion), broadcasts, system prompt. "🎨 Sayt dizayni ham AI yaratsin" toggle (default yoqilgan). |
| `app/bots/new/page.tsx` | Yuqorida diqqat tortuvchi gradient banner: "✨ AI'dan bot + sayt yarating" → `/app/bots/new/from-prompt`. |

### BeautyShop sklet pattern (qanday ishlatiladi)

Generator har generatsiyada Claude'ga BeautyShop reference'ini ko'rsatadi:

- **Bot xabarlari**: `/start` salomlashish + reply keyboard ("🛒 Mini App", "🤖 AI", "🔗 Taklif", "📞 Aloqa", "💳 To'lov")
- **AI consultant**: mutaxassis ohangda (kosmetolog → oshpaz/usta/o'qituvchi yangi biznesga moslab)
- **Referral cashback**: 2% master + 2% buyer
- **Admin photo upload**: rasm + caption ("Nomi | Kategoriya | Ta'rif | Narx") → mahsulot DB'ga
- **Brand**: pink-peach default (`#FF8FA3 → #FFD7D7`), font Playfair + Inter

Sklet **boshqa biznesga moslashtirilganda**:
- "🛒 Do'kon" → pitsa uchun "📋 Menyu", salon uchun "📅 Yozilish", kurs uchun "📚 Darslar"
- AI prompt mutaxassis turi biznesga mos
- Services 4-8 ta real mahsulot/xizmat
- Brand kit ranglari biznes mood'iga mos
- FAQ 4-6 ta real savol-javob
- Mini App + referral + admin upload pattern saqlanadi

### Foydalanuvchi oqimi

1. `/app/bots/new` → "✨ AI'dan bot + sayt yarating" tugmasi
2. Promtni yozadi (10-2000 belgi) → "✨ Generatsiya qilish" → preview (~3-5 sek, ~$0.01)
3. Yoqsa "🚀 Bot yaratish" → bot DB'ga yoziladi → `/app/bots/[id]` ga yo'naltiriladi
4. Background'da: brand kit + hero rasm + copy + page blocks → 30 sek ichida tayyor (~$0.05)
5. Foydalanuvchi token ulanadi → bot active → mijoz Mini App + AI consultant + sayt orqali ishlatadi

### Narx (har bot yaratish uchun)

- **Bot config generatsiya** (Claude): ~$0.01 (input ~500 tokens, output ~1500 tokens)
- **Brand kit** (Claude): ~$0.005
- **Site copy** (Claude): ~$0.01
- **Hero image** (Replicate Flux Schnell yoki DALL-E fallback): ~$0.003-0.04
- **Total**: ~$0.03-0.07 har generatsiya

### Production deploy

- **Migration**: `supabase/migrations/0023_beautyshop_pack.sql` (Neon DB'da RLS qismisiz qo'llandi — ownership server-side API'larda tekshiriladi)
- **Vercel**: avtomatik deploy → https://botforge-beige.vercel.app
- **Yangi env vars**: yo'q (`ANTHROPIC_API_KEY` allaqachon mavjud edi)

### Keyingi qadamlar (kelajakda)

- [ ] Streamning birinchi token kelganda preview qisman ko'rsatilsin (latency illusion)
- [ ] Foydalanuvchining oldingi promtlarini saqlash + qayta ishlatish
- [ ] "Bot generatsiya tariximi" sahifasi (`ai_generated_configs` jadvalidan)
- [ ] BeautyShop'dan tashqari `restaurant_pizza_basic`, `salon_premium` skletlari
- [ ] Generatsiya paytida real-time progress (Server-Sent Events)
