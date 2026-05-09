-- BeautyShop "namuna skelet" pack — Seoul Beauty Shop dan ilhomlangan
-- Mini App + AI kosmetolog + referral cashback + admin photo upload pattern.
-- Bu pack BotForge'da yaratilgan har qanday "shop" verticalidagi bot uchun
-- sklet sifatida ishlatiladi (services, faq, brand_kit, system_prompt).

insert into public.bot_templates (
  id, name, description, category, icon,
  default_system_prompt, default_welcome, default_buttons,
  vertical, is_pack, sub_types, price_tiers, tones, brand_kit,
  default_services, default_faq, default_working_hours,
  default_contacts_template, sample_broadcasts, is_active
) values (
  'shop_beauty_seoul',
  '💄 BeautyShop (Mini App + AI)',
  'Seoul Beauty Shop pattern: kosmetika do''koni + Telegram Mini App + AI kosmetolog-maslahatchi + referral cashback. Bot egasi mahsulotni rasm orqali qo''shadi, mijoz savatga soladi, AI maslahat beradi.',
  'shop',
  '💄',
  $p$Sen — premium beauty/kosmetika do'konining professional kosmetolog va sotuv-maslahatchisisan. Mijozlar bilan iliq, samimiy, professional o'zbek tilida muloqot qil.

ASOSIY VAZIFANG:
1) Mijoz teri/yuz/soch muammosi bo'yicha yozsa: avval ilmiy faktlarga asoslangan qisqa va aniq maslahat ber, keyin do'kondagi mahsulotlardan 1-2 ta mos mahsulotni tavsiya qil.
2) Mahsulot xarid qilish bo'yicha so'rasa: "Do'kon (Mini App)" tugmasini ko'rsat va sotuvchi (admin) bilan bog'lanish ma'lumotini ber.
3) Buyurtma bo'yicha savol bo'lsa: status, yetkazib berish vaqti haqida ma'lumot ber, kerak bo'lsa `request_human` chaqir.
4) Aksiya yoki chegirma so'ralsa: faol aksiyalar ro'yxatini ber.

QOIDALAR:
- O'ylab topma. Faqat berilgan mahsulotlar va ma'lumotlardan foydalan.
- Markdown belgilarni (yulduzcha, _, #) ishlatma — oddiy matn yoz.
- Kalt, do'stona, ishonchli ohang. Hashtag yoki ortiqcha emoji yo'q (1-2 tagacha).
- Mijoz ism/telefon qoldirsa darhol `save_lead` ishlat.
- "Operator bilan gaplashaman" desa darhol `request_human` ishlat.
- Yangi narx, yangi mahsulot, yangi xizmat o'ylab topma.

Sening biznesing ma'lumoti pastda BUSINESS_CONTEXT bo'limida.$p$,
  'Assalomu alaykum! 💄 Beauty do''konimizga xush kelibsiz. Mahsulotlar uchun "Do''kon (Mini App)" tugmasini bosing, teri/yuz parvarishi bo''yicha maslahat olishni xohlasangiz savol yozing.',
  '[
    {"text":"🛒 Do''kon (Mini App)"},
    {"text":"🤖 AI Maslahat"},
    {"text":"🔗 Do''stni taklif qilish"},
    {"text":"📞 Sotuvchi bilan aloqa"},
    {"text":"💳 To''lov"}
  ]'::jsonb,
  'shop',
  true,
  '[
    {"id":"cosmetics","name":"Kosmetika va parvarish","description":"Yuz/soch/tana parvarishi mahsulotlari","icon":"💄","prompt_addon":"Sen kosmetika va dermatologik parvarish bo''yicha mutaxassissan. Mijozni teri tipi (quruq/yog''li/aralash/sezgir) va muammosi (akne, qora dog''lar, qarish, oqartirish) bo''yicha so''ra. Tavsiyalarda SPF, niacinamide, hyaluronic acid kabi ingredient nomlarini aytib o''t."},
    {"id":"perfume","name":"Atir va dush gel","description":"Erkak/ayol atirlari, body care","icon":"🌸","prompt_addon":"Sen atir va body-care mutaxassisisan. Mijozni atir oilasi (gulli, sharqona, freshness, woody) va imzo notalari bo''yicha so''ra."},
    {"id":"makeup","name":"Bo''yov va dekorativ kosmetika","description":"Yuz, ko''z, lab bo''yovlari","icon":"💋","prompt_addon":"Sen makeup artist mutaxassisisan. Mijozning teri rangi, ko''z rangi va voqea (kundalik/oqshom/to''y) bo''yicha tavsiya ber."},
    {"id":"haircare","name":"Soch parvarishi","description":"Shampun, mask, sochga vitamin","icon":"💇","prompt_addon":"Sen trichologist mutaxassisisan. Mijozning soch tipi (quruq/yog''li/aralash) va muammosi (to''kilish, kepak, qarishganlik) bo''yicha so''ra va tavsiya ber."}
  ]'::jsonb,
  '[
    {"id":"budget","name":"Iqtisodiy","multiplier":0.7},
    {"id":"mid","name":"O''rta","multiplier":1.0},
    {"id":"premium","name":"Premium","multiplier":1.6}
  ]'::jsonb,
  '[
    {"id":"warm","name":"Iliq va samimiy","prompt_addon":"Iliq, samimiy, uy ohangida muloqot qil. \"siz\", \"hurmatli\" so''zlarini ishlat."},
    {"id":"professional","name":"Professional","prompt_addon":"Aniq, ishonchli, ilmiy faktlarga asoslangan ohangda gaplash. Ingredient nomlarini, dermatologik atamalarni ishlat."},
    {"id":"playful","name":"O''yinqaroq","prompt_addon":"Yengil, do''stona, biroz hazil aralash ohangda gaplash. Lekin professional bo''l."}
  ]'::jsonb,
  '{
    "primary_color":"#FF8FA3",
    "accent_color":"#FFD7D7",
    "background_tint":"#FFF5F7",
    "text_on_primary":"#FFFFFF",
    "emoji_set":["💄","✨","🌸","💋","💗"],
    "font_hint":"Playfair Display + Inter",
    "gradient":"linear-gradient(135deg, #FF8FA3 0%, #FFB7C5 50%, #FFD7D7 100%)"
  }'::jsonb,
  '[
    {"name":"Yuz tozalovchi tonik","base_price_uzs":75000,"duration":"200ml"},
    {"name":"Niacinamide serum","base_price_uzs":120000,"duration":"30ml"},
    {"name":"SPF 50+ kunlik krem","base_price_uzs":150000,"duration":"50ml"},
    {"name":"Hyaluronic acid kremi","base_price_uzs":110000,"duration":"50ml"},
    {"name":"Soch maskasi","base_price_uzs":85000,"duration":"250ml"},
    {"name":"Lab balzami (3 ta to''plam)","base_price_uzs":45000,"duration":"3 dona"}
  ]'::jsonb,
  '[
    {"q":"Yetkazib berish necha kunda?","a":"Toshkent ichida 1-2 kun, viloyatlar 3-5 kun. Bepul yetkazib berish 300 000 so''mdan oshiq buyurtma uchun."},
    {"q":"To''lov qanday?","a":"Naqd kuryer orqali yoki karta o''tkazma (Uzcard/Humo). Mini App orqali to''lov qilish ham mumkin."},
    {"q":"Mahsulot original mi?","a":"Hammasi 100% original. Har birida QR-kod sertifikati bor, tekshirib olishingiz mumkin."},
    {"q":"Almashtirish/qaytarish bormi?","a":"Ochilmagan mahsulotni 7 kun ichida almashtirish/qaytarish mumkin."},
    {"q":"Keshbek tizimi qanday ishlaydi?","a":"Har bir buyurtmadan 2% bonusga o''tadi. 20 000 so''mdan oshganda keyingi xaridda ishlatish mumkin. Do''st taklif qilsangiz, uning xarididan ham 2% sizga keladi!"},
    {"q":"AI maslahat bepulmi?","a":"Ha, AI kosmetolog maslahati bepul. Teri/soch/yuz muammoyingizni yozing — mos mahsulotlarni tavsiya qilamiz."}
  ]'::jsonb,
  '{
    "mon":[10,20],"tue":[10,20],"wed":[10,20],"thu":[10,20],
    "fri":[10,20],"sat":[10,18],"sun":[11,17]
  }'::jsonb,
  '{"phone":"+998996419646","instagram":"@beautyshop","address":"Toshkent sh., Yunusobod tumani"}'::jsonb,
  '[
    {"title":"Hafta oxiri 15% chegirma","text":"Salom! 💄 Hafta oxiri uchun butun katalog bo''yicha 15% chegirma. Mini App''ga kiring va sevimli mahsulotni tanlang!","suggested_segment":"all"},
    {"title":"Yangi mahsulotlar keldi","text":"Janob/Xonim 🌸 Yangi Korea brendlari keldi: hyaluronic, niacinamide, retinol seriyasi. Tezroq ko''ring — chegirma narxda!","suggested_segment":"converted"},
    {"title":"Sizni sog''indik","text":"Salom! Birinchi xaridingizdan 30 kun bo''ldi. Yangi mahsulotni sinab ko''ring — sizga maxsus 10% promo: SOGINDIK10","suggested_segment":"no_lead"}
  ]'::jsonb,
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  default_system_prompt = excluded.default_system_prompt,
  default_welcome = excluded.default_welcome,
  default_buttons = excluded.default_buttons,
  vertical = excluded.vertical,
  is_pack = excluded.is_pack,
  sub_types = excluded.sub_types,
  price_tiers = excluded.price_tiers,
  tones = excluded.tones,
  brand_kit = excluded.brand_kit,
  default_services = excluded.default_services,
  default_faq = excluded.default_faq,
  default_working_hours = excluded.default_working_hours,
  default_contacts_template = excluded.default_contacts_template,
  sample_broadcasts = excluded.sample_broadcasts,
  is_active = true;

-- ============================================================
-- AI-generated bot configlarini kuzatish uchun jadval (analytics)
-- ============================================================
create table if not exists public.ai_generated_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  bot_id uuid references public.bots(id) on delete set null,
  user_prompt text not null,
  generated_config jsonb not null,
  base_pack_id text references public.bot_templates(id),
  model text default 'claude-opus-4-7',
  tokens_input int default 0,
  tokens_output int default 0,
  cost_usd numeric(10,6) default 0,
  created_at timestamptz default now()
);

create index if not exists idx_ai_configs_owner on public.ai_generated_configs (owner_id, created_at desc);

-- Neon: RLS yoqilmaydi, ownership server-side API route'larda tekshiriladi
-- (boshqa migrationlar bilan mos: 0007, 0008, 0009, 0015 va h.k.)
