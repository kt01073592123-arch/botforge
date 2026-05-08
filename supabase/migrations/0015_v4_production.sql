-- v4 Production MVP — bookings, orders, reviews, loyalty, customer profiles
-- Hammasi bir migration’da, mantiqiy guruhlangan.

-- ════════════════════════════════════════════
-- 1. BOOKINGS — bron tizimi
-- ════════════════════════════════════════════
do $$ begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum (
      'pending',     -- mijoz bron qildi, admin tasdiqlamadi
      'confirmed',   -- admin tasdiqladi
      'cancelled',   -- bekor qilindi
      'completed',   -- amalga oshdi
      'no_show'      -- mijoz kelmadi
    );
  end if;
end $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  -- Customer (Telegram’dan kelganlar uchun tg_user_id)
  customer_name text,
  customer_phone text,
  customer_tg_id bigint,
  customer_tg_username text,
  -- Slot
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  -- Xizmat (services array’dan name)
  service_name text not null,
  service_price text,
  service_duration text,
  -- Status va meta
  status booking_status default 'pending',
  notes text,
  reminder_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bookings_bot_slot on public.bookings (bot_id, slot_start);
create index if not exists idx_bookings_status on public.bookings (bot_id, status, slot_start);
create index if not exists idx_bookings_reminder on public.bookings (slot_start)
  where status in ('pending','confirmed') and reminder_sent = false;

-- Slot to‘qnashuvini oldini olish: bitta bot uchun bitta slot’ga 1 ta bron
-- Faqat bekor qilinmagan bronlar
create unique index if not exists uq_bookings_slot
  on public.bookings (bot_id, slot_start)
  where status not in ('cancelled', 'no_show');

-- ════════════════════════════════════════════
-- 2. ORDERS — buyurtma lifecycle (WebApp savat)
-- ════════════════════════════════════════════
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'pending',     -- yangi
      'confirmed',   -- admin tasdiqladi
      'in_progress', -- bajarilmoqda
      'completed',   -- bajarildi
      'cancelled'    -- bekor qilindi
    );
  end if;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  -- Customer
  customer_name text,
  customer_phone text,
  customer_tg_id bigint,
  customer_tg_username text,
  -- Items snapshot
  items jsonb not null default '[]',
  total_uzs int not null default 0,
  note text,
  -- Status
  status order_status default 'pending',
  -- Payment
  paid boolean default false,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_orders_bot on public.orders (bot_id, created_at desc);
create index if not exists idx_orders_status on public.orders (bot_id, status, created_at desc);

-- ════════════════════════════════════════════
-- 3. REVIEWS — sharhlar (5 yulduz + matn)
-- ════════════════════════════════════════════
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  customer_tg_id bigint,
  customer_name text,
  -- 1-5 yulduz
  rating int not null check (rating between 1 and 5),
  text text,
  -- Bog‘lash (ixtiyoriy)
  booking_id uuid references public.bookings(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  -- Public’da ko‘rsatishni tasdiqlash (default true)
  is_published boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_bot on public.reviews (bot_id, created_at desc);
create index if not exists idx_reviews_published
  on public.reviews (bot_id, created_at desc)
  where is_published = true;

-- ════════════════════════════════════════════
-- 4. CUSTOMERS — agregat profil (view orqali real-time)
-- ════════════════════════════════════════════
-- Customer = unique (bot_id, tg_user_id) bilan biriktirilgan inson.
-- Custom tag’lar va shaxsiy izohlar uchun alohida jadval.
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  tg_user_id bigint not null,
  -- Cache uchun (tarixdan)
  display_name text,
  phone text,
  username text,
  -- Tag va izoh
  tags text[] default '{}',
  notes text,
  -- Loyalty
  loyalty_points int default 0,
  total_spent_uzs bigint default 0,
  total_bookings int default 0,
  total_orders int default 0,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique (bot_id, tg_user_id)
);

create index if not exists idx_cp_bot on public.customer_profiles (bot_id, last_seen_at desc);

-- ════════════════════════════════════════════
-- 5. LOYALTY — sodiqlik dasturi config
-- ════════════════════════════════════════════
create table if not exists public.loyalty_configs (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  enabled boolean default false,
  -- "Punch card": har N-buyurtmadan keyin 1 ta bepul
  punch_threshold int default 5,
  punch_reward text default '1 ta xizmat 50% chegirma',
  -- Referral
  referral_enabled boolean default false,
  referral_bonus_uzs int default 50000,  -- yangi mijozni olib kelgan referrer’ga
  updated_at timestamptz default now()
);

-- Referral kuzatuvi
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  referrer_tg_id bigint not null,
  referred_tg_id bigint not null,
  bonus_granted boolean default false,
  bonus_uzs int default 0,
  created_at timestamptz default now(),
  unique (bot_id, referred_tg_id)
);

create index if not exists idx_referrals_referrer on public.referrals (bot_id, referrer_tg_id);

-- ════════════════════════════════════════════
-- TRIGGERS — updated_at va customer_profiles auto-track
-- ════════════════════════════════════════════
drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.touch_updated_at();

-- Customer profile’ni avtomatik yaratish/yangilash
create or replace function public.upsert_customer_profile(
  p_bot_id uuid,
  p_tg_id bigint,
  p_name text default null,
  p_phone text default null,
  p_username text default null
) returns void
language plpgsql
as $$
begin
  insert into public.customer_profiles (bot_id, tg_user_id, display_name, phone, username, last_seen_at)
  values (p_bot_id, p_tg_id, p_name, p_phone, p_username, now())
  on conflict (bot_id, tg_user_id) do update set
    display_name = coalesce(excluded.display_name, customer_profiles.display_name),
    phone        = coalesce(excluded.phone, customer_profiles.phone),
    username     = coalesce(excluded.username, customer_profiles.username),
    last_seen_at = now();
end $$;

-- ════════════════════════════════════════════
-- AVAILABILITY RPC — slot tekshirish
-- ════════════════════════════════════════════
-- Bo‘sh slotlarni qaytaradi: ish vaqti ichida, mavjud bronlardan bo‘sh.
create or replace function public.find_available_slots(
  p_bot_id uuid,
  p_date date,
  p_duration_min int,
  p_step_min int default 30
) returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable
as $$
declare
  hours jsonb;
  day_key text;
  day_hours jsonb;
  start_h int;
  end_h int;
  cur timestamptz;
  slot_e timestamptz;
  conflict boolean;
begin
  -- Ish vaqtini bot_data’dan olamiz
  select working_hours into hours
  from public.bot_data
  where bot_id = p_bot_id;

  if hours is null then
    return;
  end if;

  day_key := lower(to_char(p_date, 'dy'));
  day_hours := hours -> day_key;

  if day_hours = 'null'::jsonb or day_hours is null then
    return; -- dam kuni
  end if;

  start_h := (day_hours -> 0)::int;
  end_h := (day_hours -> 1)::int;

  cur := (p_date::text || ' ' || start_h || ':00:00')::timestamptz;

  while cur + (p_duration_min || ' minutes')::interval <= (p_date::text || ' ' || end_h || ':00:00')::timestamptz loop
    slot_e := cur + (p_duration_min || ' minutes')::interval;

    -- O‘zaro to‘qnashuv tekshirish
    select exists (
      select 1 from public.bookings b
      where b.bot_id = p_bot_id
        and b.status not in ('cancelled', 'no_show')
        and tstzrange(b.slot_start, b.slot_end) && tstzrange(cur, slot_e)
    ) into conflict;

    if not conflict and cur > now() then
      slot_start := cur;
      slot_end := slot_e;
      return next;
    end if;

    cur := cur + (p_step_min || ' minutes')::interval;
  end loop;
end $$;
