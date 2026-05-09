-- 0022 — Super-admin panel infrastructure.
-- Audit log, platform announcements, va admin'larning amal kuzatuvi.

-- ════════════════════════════════════════════
-- AUDIT LOG — kim qachon nima qilgan
-- ════════════════════════════════════════════
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.app_users(id) on delete set null,
  actor_telegram_id bigint,
  action text not null,           -- 'user_banned', 'plan_changed', 'broadcast_sent', ...
  target_type text,                -- 'user', 'bot', 'plan', 'subscription'
  target_id text,
  details jsonb default '{}',
  ip text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs (actor_user_id, created_at desc);
create index if not exists idx_audit_logs_target on public.audit_logs (target_type, target_id, created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs (action, created_at desc);

-- ════════════════════════════════════════════
-- PLATFORM ANNOUNCEMENTS — admin hamma sellerlarga yuboradigan xabarlar
-- ════════════════════════════════════════════
create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text default 'all',     -- 'all' | 'free' | 'paid' | 'pro' | 'max'
  delivery_via text default 'telegram', -- 'telegram' | 'in_app' | 'both'
  total_recipients int default 0,
  total_sent int default 0,
  total_failed int default 0,
  status text default 'draft',     -- 'draft' | 'sending' | 'done' | 'cancelled'
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references public.app_users(id),
  created_at timestamptz default now()
);

create index if not exists idx_platform_announcements_status on public.platform_announcements (status, scheduled_at);

-- ════════════════════════════════════════════
-- USER BANS — admin foydalanuvchi'ni to'xtatishi
-- ════════════════════════════════════════════
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_users' and column_name = 'banned_at'
  ) then
    alter table public.app_users add column banned_at timestamptz;
    alter table public.app_users add column ban_reason text;
  end if;
end $$;

-- ════════════════════════════════════════════
-- ADMIN STATS RPC — dashboard uchun bitta chaqiruv bilan hammasini qaytaradi
-- ════════════════════════════════════════════
create or replace function public.admin_overview_stats() returns jsonb
language sql as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.app_users where banned_at is null),
    'banned_users', (select count(*) from public.app_users where banned_at is not null),
    'new_users_7d', (select count(*) from public.app_users where created_at > now() - interval '7 days'),
    'total_bots', (select count(*) from public.bots where deleted_at is null),
    'active_bots', (select count(*) from public.bots where deleted_at is null and status = 'active'),
    'paused_bots', (select count(*) from public.bots where deleted_at is null and status = 'paused'),
    'total_messages_30d', (select count(*) from public.messages where created_at > now() - interval '30 days'),
    'total_leads_30d', (select count(*) from public.leads where created_at > now() - interval '30 days'),
    'total_bookings_30d', coalesce((select count(*) from public.bookings where created_at > now() - interval '30 days'), 0),
    'total_orders_30d', coalesce((select count(*) from public.orders where created_at > now() - interval '30 days'), 0),
    'ai_cost_30d', coalesce((select sum(cost_usd) from public.ai_usage where created_at > now() - interval '30 days'), 0),
    'ai_tokens_30d', coalesce((select sum(prompt_tokens + completion_tokens) from public.ai_usage where created_at > now() - interval '30 days'), 0),
    'paid_subscriptions', (
      select count(*) from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.active = true and p.price_uzs > 0
    ),
    'mrr_uzs', coalesce((
      select sum(p.price_uzs) from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.active = true
    ), 0),
    'webhook_errors_24h', coalesce((select count(*) from public.webhook_logs where created_at > now() - interval '24 hours'), 0)
  );
$$;

-- AI cost anomaliyalar — bot oxirgi 24h cost / oldingi 7d kunlik o'rtacha > 3x
create or replace function public.admin_ai_anomalies(p_threshold numeric default 3.0) returns table (
  bot_id uuid,
  bot_name text,
  cost_24h numeric,
  avg_cost_7d numeric,
  ratio numeric
)
language sql as $$
  with d24 as (
    select bot_id, sum(cost_usd) as c
    from public.ai_usage
    where created_at > now() - interval '24 hours'
    group by bot_id
  ),
  d7 as (
    select bot_id, sum(cost_usd) / 7.0 as avg_c
    from public.ai_usage
    where created_at > now() - interval '8 days' and created_at <= now() - interval '24 hours'
    group by bot_id
  )
  select
    d24.bot_id,
    b.name as bot_name,
    d24.c::numeric as cost_24h,
    coalesce(d7.avg_c, 0)::numeric as avg_cost_7d,
    case when coalesce(d7.avg_c, 0) > 0 then (d24.c / d7.avg_c)::numeric else 999::numeric end as ratio
  from d24
  left join d7 on d7.bot_id = d24.bot_id
  left join public.bots b on b.id = d24.bot_id
  where d24.c > 0.10
    and (d7.avg_c is null or d24.c / d7.avg_c > p_threshold)
  order by ratio desc
  limit 50;
$$;
