-- Mini App tugmasi va custom buttons qo'llab-quvvatlash.
--
-- Maqsad: AI prompt'dan yaratilgan botlar /start javobida haqiqiy
-- Telegram WebApp button (web_app: {url}) bilan chiqsin, faqat oddiy
-- text label emas. Avvalgi runtime faqat string array ishlatardi.
--
-- Yangi format (bot_data.custom_buttons):
--   [
--     {"text":"🛒 Do'kon (Mini App)", "web_app": true, "url": "/c/{username}"},
--     {"text":"🤖 AI Maslahat"},
--     {"text":"📞 Aloqa"}
--   ]
--
-- Agar `web_app` true bo'lsa va `url` bo'sh bo'lsa, runtime avtomatik
-- ${NEXT_PUBLIC_APP_URL}/c/{tg_username} dan foydalanadi (storefront/customer page).

alter table public.bot_data
  add column if not exists custom_buttons jsonb default null;

comment on column public.bot_data.custom_buttons is
  'AI generatsiya yoki bot egasi tomonidan o''zgartirilgan tugmalar. NULL bo''lsa bot_templates.default_buttons ishlatiladi. Format: [{"text":"...","web_app":bool?,"url":"..."?}]';
