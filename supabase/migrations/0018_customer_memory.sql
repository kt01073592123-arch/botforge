-- 0018 — Customer profiles (long-term memory) + summarization storage
-- Bot mijozni eslab qoladi: oldingi xizmatlar, til, preferences, lifetime value.

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  tg_user_id bigint not null,
  -- Identifikatsiya
  display_name text,
  phone text,
  language text,
  -- AI yig'gan ma'lumotlar
  summary text,                       -- "Mijoz har kuni ertalab kofe oladi"
  preferences jsonb default '[]',     -- ["latte", "qora", "no sugar"]
  notes jsonb default '[]',           -- [{date, text, type}]
  tags text[] default '{}',           -- ['vip', 'regular', 'first_time']
  -- Behavioral
  total_conversations int default 0,
  total_messages int default 0,
  total_orders int default 0,
  total_bookings int default 0,
  lifetime_value_uzs bigint default 0,
  last_seen_at timestamptz default now(),
  first_seen_at timestamptz default now(),
  -- Auto-tuning
  last_summarized_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bot_id, tg_user_id)
);

create index if not exists idx_customer_profiles_bot on public.customer_profiles (bot_id, last_seen_at desc);
create index if not exists idx_customer_profiles_phone on public.customer_profiles (bot_id, phone) where phone is not null;
-- now() partial index'da ishlatib bo'lmaydi (IMMUTABLE emas)
-- Faqat summary is null partial — eski yozuvlarni cron yoki app filter qiladi
create index if not exists idx_customer_profiles_resummarize on public.customer_profiles (last_summarized_at)
  where summary is null;

-- ════════════════════════════════════════════
-- Behavioral counters — har xabar/buyurtma'da chaqiriladi
-- ════════════════════════════════════════════
create or replace function public.touch_customer_profile(
  p_bot_id uuid,
  p_tg_user_id bigint,
  p_display_name text default null,
  p_phone text default null,
  p_language text default null
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.customer_profiles (bot_id, tg_user_id, display_name, phone, language)
  values (p_bot_id, p_tg_user_id, p_display_name, p_phone, p_language)
  on conflict (bot_id, tg_user_id) do update set
    display_name = coalesce(excluded.display_name, customer_profiles.display_name),
    phone = coalesce(excluded.phone, customer_profiles.phone),
    language = coalesce(excluded.language, customer_profiles.language),
    last_seen_at = now(),
    total_messages = customer_profiles.total_messages + 1,
    updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- Summarization yangilash (background job natijasi)
create or replace function public.update_customer_summary(
  p_bot_id uuid,
  p_tg_user_id bigint,
  p_summary text,
  p_preferences jsonb default null,
  p_tags text[] default null
) returns void
language sql as $$
  update public.customer_profiles
  set summary = p_summary,
      preferences = coalesce(p_preferences, preferences),
      tags = coalesce(p_tags, tags),
      last_summarized_at = now(),
      updated_at = now()
  where bot_id = p_bot_id and tg_user_id = p_tg_user_id;
$$;

-- ════════════════════════════════════════════
-- Booking/order natijalari → customer profilega aks etadi (trigger)
-- ════════════════════════════════════════════
create or replace function public.sync_customer_on_booking() returns trigger
language plpgsql as $$
begin
  if new.customer_tg_id is not null then
    update public.customer_profiles
    set total_bookings = total_bookings + 1,
        updated_at = now()
    where bot_id = new.bot_id and tg_user_id = new.customer_tg_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_customer_on_booking on public.bookings;
create trigger trg_sync_customer_on_booking
  after insert on public.bookings
  for each row execute function public.sync_customer_on_booking();

create or replace function public.sync_customer_on_order() returns trigger
language plpgsql as $$
begin
  if new.customer_tg_id is not null then
    update public.customer_profiles
    set total_orders = total_orders + 1,
        lifetime_value_uzs = lifetime_value_uzs + coalesce(new.total_uzs, 0),
        updated_at = now()
    where bot_id = new.bot_id and tg_user_id = new.customer_tg_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_customer_on_order on public.orders;
create trigger trg_sync_customer_on_order
  after insert on public.orders
  for each row execute function public.sync_customer_on_order();
