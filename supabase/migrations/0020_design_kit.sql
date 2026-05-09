-- 0020 — AI-generated design kits + assets storage.
-- Har bot uchun AI yaratgan brand kit (rang/font/emoji), copy (hero/USP/CTA) va
-- generated rasmlar (hero, og_image, fallback gallery) saqlanadi.

-- ════════════════════════════════════════════
-- DESIGN KITS — har bot uchun AI generatsiyasidan keyin saqlanadi.
-- Versioning bilan: bot egasi yangi variant generate qila oladi.
-- ════════════════════════════════════════════
create table if not exists public.design_kits (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  version int not null default 1,
  is_active boolean not null default true,

  -- Brand kit (AI generated palette)
  primary_color text,         -- '#FF5733'
  accent_color text,
  background_color text,
  surface_color text,
  text_color text,
  text_muted_color text,
  gradient_from text,
  gradient_to text,
  font_heading text,          -- 'Inter', 'Playfair Display'
  font_body text,
  emoji_set jsonb default '[]', -- ['💇', '✨', '💄']
  logo_emoji text,
  -- Rasm va asset URL'lari
  hero_image_url text,
  hero_image_alt text,
  og_image_url text,
  favicon_url text,
  -- Layout va template tanlovi
  template_id text default 'service', -- 'restaurant'|'salon'|'shop'|'course'|'service'
  layout_density text default 'comfortable', -- 'compact'|'comfortable'|'spacious'
  -- AI copy (matnlar)
  hero_headline text,
  hero_subheadline text,
  hero_cta_primary text,
  hero_cta_secondary text,
  usp_items jsonb default '[]',  -- [{icon, title, description}, ...]
  about_text text,
  testimonial_seeds jsonb default '[]',  -- [{name, text, rating}, ...]

  -- Mood va tone (AI'ga keyingi generatsiya uchun hint)
  brand_voice text,           -- 'professional' | 'friendly' | 'luxury' | 'playful'
  mood_keywords text[],       -- ['minimalist','warm','tech-forward']

  -- Audit
  generated_by_model text,
  generation_meta jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_design_kits_bot on public.design_kits (bot_id, is_active, version desc);
create unique index if not exists uq_design_kits_active on public.design_kits (bot_id) where is_active = true;

-- ════════════════════════════════════════════
-- AI ASSETS — alohida generate qilingan har xil rasmlar (galery, products, ...)
-- Har biri Replicate/Flux/DALL-E orqali yaratilgan, blob storage URL bilan
-- ════════════════════════════════════════════
do $$ begin
  if not exists (select 1 from pg_type where typname = 'asset_kind') then
    create type asset_kind as enum (
      'hero',
      'og_image',
      'gallery',
      'product',
      'service',
      'about',
      'testimonial_avatar',
      'logo'
    );
  end if;
end $$;

create table if not exists public.ai_assets (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  design_kit_id uuid references public.design_kits(id) on delete cascade,
  kind asset_kind not null,
  url text not null,
  prompt text,
  alt_text text,
  width int,
  height int,
  file_size_bytes int,
  provider text,         -- 'replicate' | 'flux' | 'dalle3' | 'unsplash' | 'upload'
  provider_meta jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_ai_assets_bot on public.ai_assets (bot_id, kind, is_active);

-- ════════════════════════════════════════════
-- DESIGN GENERATION JOBS — async generatsiya kuzatuvi
-- (Replicate javobi 10-30 sekund kelishi mumkin)
-- ════════════════════════════════════════════
do $$ begin
  if not exists (select 1 from pg_type where typname = 'design_job_status') then
    create type design_job_status as enum ('queued', 'running', 'done', 'failed');
  end if;
end $$;

create table if not exists public.design_jobs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  design_kit_id uuid references public.design_kits(id) on delete set null,
  kind text not null,           -- 'brand'|'copy'|'hero_image'|'full'
  status design_job_status default 'queued',
  prompt text,
  result jsonb,
  error text,
  cost_usd numeric(10, 6) default 0,
  duration_ms int,
  created_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists idx_design_jobs_bot on public.design_jobs (bot_id, created_at desc);
create index if not exists idx_design_jobs_running on public.design_jobs (status, created_at)
  where status in ('queued', 'running');

-- ════════════════════════════════════════════
-- Bots jadvaliga yangi ustun: business_type aniq bo'lishi uchun (template router uchun)
-- ════════════════════════════════════════════
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bots' and column_name = 'business_vertical'
  ) then
    alter table public.bots add column business_vertical text default 'service';
  end if;
end $$;
