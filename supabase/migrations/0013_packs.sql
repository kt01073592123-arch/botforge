-- Vertical Starter Packs — Level 3 (sub-types, price tiers, tones, brand kit, services, FAQ, broadcasts)

alter table public.bot_templates
  add column if not exists vertical text,
  add column if not exists sub_types jsonb default '[]'::jsonb,
  add column if not exists price_tiers jsonb default '[]'::jsonb,
  add column if not exists tones jsonb default '[]'::jsonb,
  add column if not exists brand_kit jsonb default '{}'::jsonb,
  add column if not exists default_services jsonb default '[]'::jsonb,
  add column if not exists default_faq jsonb default '[]'::jsonb,
  add column if not exists default_working_hours jsonb default '{}'::jsonb,
  add column if not exists default_contacts_template jsonb default '{}'::jsonb,
  add column if not exists sample_broadcasts jsonb default '[]'::jsonb,
  add column if not exists is_pack boolean default false;

-- Eski generic "beauty_manager" template’ni o‘chiramiz — uning o‘rniga 3 ta vertical pack keladi
delete from public.bot_templates where id = 'beauty_manager';
