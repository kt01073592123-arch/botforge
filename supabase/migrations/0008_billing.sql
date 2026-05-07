-- Tariflar va to‘lovlar.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_uzs int not null,
  bot_limit int not null,
  message_limit int not null,
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

create table if not exists public.subscriptions (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  active boolean default true,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

create or replace function public.ensure_subscription(p_user_id uuid) returns void
language plpgsql as $$
begin
  insert into public.subscriptions (user_id, plan_id, active)
  values (p_user_id, 'free', true)
  on conflict (user_id) do nothing;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'pay_provider') then
    create type pay_provider as enum ('click', 'payme', 'stripe', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'pay_status') then
    create type pay_status as enum ('pending', 'authorized', 'paid', 'cancelled', 'failed');
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  provider pay_provider not null,
  provider_txn_id text,
  merchant_trans_id text unique,
  amount_uzs int not null,
  status pay_status default 'pending',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  paid_at timestamptz
);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);

create or replace function public.check_bot_limit(p_user_id uuid) returns boolean
language sql stable as $$
  select (select count(*) from public.bots where owner_id = p_user_id and deleted_at is null) <
         coalesce((select p.bot_limit
                   from public.subscriptions s
                   join public.plans p on p.id = s.plan_id
                   where s.user_id = p_user_id and s.active), 1);
$$;

create or replace function public.upgrade_subscription(p_user_id uuid, p_plan_id text, p_period_days int default 30)
returns void
language sql as $$
  insert into public.subscriptions (user_id, plan_id, active, current_period_end, updated_at)
  values (p_user_id, p_plan_id, true, now() + (p_period_days || ' days')::interval, now())
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    active = true,
    current_period_end = excluded.current_period_end,
    updated_at = now();

  update public.bots b
     set monthly_message_limit = p.message_limit
    from public.plans p
   where b.owner_id = p_user_id and p.id = p_plan_id;
$$;
