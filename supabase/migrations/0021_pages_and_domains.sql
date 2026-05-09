-- 0021 — Visual page editor + custom domains.
-- Bot egasi sayt qismlarini drag/drop tartiblashi, custom CSS qo'shishi va o'z domenini
-- ulashi mumkin (CNAME orqali).

-- ════════════════════════════════════════════
-- BOT_PAGES — har sayt uchun sahifalar (default: home)
-- Block-based JSON layout
-- ════════════════════════════════════════════
create table if not exists public.bot_pages (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  slug text not null default 'home',         -- 'home', 'about', 'menu'
  title text,
  meta_description text,
  -- JSON layout: [{type: "hero", order: 0, props: {...}}, {type: "features", ...}, ...]
  blocks jsonb default '[]',
  -- Custom CSS (Pro tarif)
  custom_css text,
  custom_head text,                           -- favicon, custom fonts, meta
  is_published boolean default true,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (bot_id, slug)
);

create index if not exists idx_bot_pages_bot on public.bot_pages (bot_id);

-- ════════════════════════════════════════════
-- CUSTOM DOMAINS — bot egasi o'z domenini ulashi (white-label)
-- CNAME → cname.vercel-dns.com
-- ════════════════════════════════════════════
create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  domain text unique not null,                -- 'salonim.uz', 'shop.example.com'
  is_verified boolean default false,
  verification_token text,
  ssl_provisioned boolean default false,
  created_at timestamptz default now(),
  verified_at timestamptz
);

create index if not exists idx_custom_domains_bot on public.custom_domains (bot_id);
create index if not exists idx_custom_domains_lookup on public.custom_domains (domain) where is_verified = true;

-- ════════════════════════════════════════════
-- A/B TESTS (foundation, hozir DB only)
-- ════════════════════════════════════════════
create table if not exists public.ab_tests (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  name text not null,
  variant_a_kit_id uuid references public.design_kits(id) on delete set null,
  variant_b_kit_id uuid references public.design_kits(id) on delete set null,
  traffic_split int default 50,               -- A ga ketadigan % (qolgani B'ga)
  is_active boolean default false,
  started_at timestamptz,
  ended_at timestamptz,
  winner text,                                -- 'a' | 'b' | null
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════
-- Bots'ga page editor uchun preference ustunlari
-- ════════════════════════════════════════════
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bots' and column_name = 'public_url_slug'
  ) then
    alter table public.bots add column public_url_slug text;
  end if;
end $$;
