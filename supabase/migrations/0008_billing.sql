-- Tariflar va to‘lovlar.

create table if not exists public.plans (
  id text primary key,            -- 'free' | 'start' | 'pro' | 'max'
  name text not null,
  price_uzs int not null,         -- so‘m, oy
  bot_limit int not null,
  message_limit int not null,     -- bot bo‘yicha oy
  kb_chunks_limit int not null,
  features jsonb default '[]',
  is_active boolean default true,
  sort_order int default 0
);

insert into public.plans (id, name, price_uzs, bot_limit, message_limit, kb_chunks_limit, features, sort_order) values
('free', 'Free', 0, 1, 200, 50, '["AI Manager bot","Asosiy template"]'::jsonb, 0),
('start', 'Start', 99000, 1, 3000, 500, '["AI Manager + Lead + Support","Bilim bazasi","Operator chat"]'::jsonb, 1),
('pro', 'Pro', 199000, 5, 20000, 5000, '["Hammasi","Broadcast","CRM","Analytics","5 ta bot"]'::jsonb, 2),
('max', 'Max', 399000, 20, 100000, 50000, '["Pro + 20 bot","White-label","Priority support"]'::jsonb, 3)
on conflict (id) do update set
  name = excluded.name,
  price_uzs = excluded.price_uzs,
  bot_limit = excluded.bot_limit,
  message_limit = excluded.message_limit,
  kb_chunks_limit = excluded.kb_chunks_limit,
  features = excluded.features,
  sort_order = excluded.sort_order;

alter table public.plans enable row level security;
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select using (true);

-- Foydalanuvchining hozirgi obunasi
create table if not exists public.subscriptions (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  active boolean default true,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists subs_owner on public.subscriptions;
create policy subs_owner on public.subscriptions for select
  using (user_id = public.current_app_user_id());

-- Default har user’ga `free`
create or replace function public.ensure_subscription(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id, plan_id, active)
  values (p_user_id, 'free', true)
  on conflict (user_id) do nothing;
end $$;

grant execute on function public.ensure_subscription(uuid) to service_role, authenticated;

-- To‘lov tranzaksiyalari (Click, keyin Payme/Stripe ham qo‘shiladi)
create type pay_provider as enum ('click', 'payme', 'stripe', 'manual');
create type pay_status as enum ('pending', 'authorized', 'paid', 'cancelled', 'failed');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  provider pay_provider not null,
  provider_txn_id text,             -- Click click_trans_id va h.k.
  merchant_trans_id text unique,    -- bizning ichki id
  amount_uzs int not null,
  status pay_status default 'pending',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  paid_at timestamptz
);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;
drop policy if exists pay_owner on public.payments;
create policy pay_owner on public.payments for select
  using (user_id = public.current_app_user_id());

-- Plan limit checker
create or replace function public.check_bot_limit(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.bots where owner_id = p_user_id and deleted_at is null) <
         coalesce((select p.bot_limit
                   from public.subscriptions s
                   join public.plans p on p.id = s.plan_id
                   where s.user_id = p_user_id and s.active), 1);
$$;

grant execute on function public.check_bot_limit(uuid) to service_role, authenticated;

-- Plan o‘zgartirish (to‘lov muvaffaqiyatli bo‘lsa)
create or replace function public.upgrade_subscription(p_user_id uuid, p_plan_id text, p_period_days int default 30)
returns void
language sql security definer set search_path = public as $$
  insert into public.subscriptions (user_id, plan_id, active, current_period_end, updated_at)
  values (p_user_id, p_plan_id, true, now() + (p_period_days || ' days')::interval, now())
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    active = true,
    current_period_end = excluded.current_period_end,
    updated_at = now();

  -- Plan limitiga botlarning monthly_message_limit ni yangilash
  update public.bots b
     set monthly_message_limit = p.message_limit
    from public.plans p
   where b.owner_id = p_user_id and p.id = p_plan_id;
$$;

grant execute on function public.upgrade_subscription(uuid, text, int) to service_role;
