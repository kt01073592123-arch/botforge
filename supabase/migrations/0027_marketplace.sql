-- Marketplace: bot egasi /explore sahifasida ko'rinishni xohlasa is_public=true.
-- White-label: max plan uchun "Powered by BotForge" olib tashlanadi.

alter table public.bots
  add column if not exists is_public boolean default false;

alter table public.bots
  add column if not exists description text default null;

alter table public.bots
  add column if not exists explore_category text default null;

create index if not exists idx_bots_public
  on public.bots (is_public, status, created_at desc)
  where is_public and deleted_at is null;

-- White-label flag — har bir tarif darajasi uchun. Plans table'ga
-- jsonb features ichida 'white_label' bor yoki yo'qligini saqlaymiz.
update public.plans
   set features = features || '["White-label"]'::jsonb
 where id = 'max'
   and not (features @> '["White-label"]'::jsonb);
