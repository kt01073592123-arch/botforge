-- A/B test uchun welcome xabar variantlari.
--
-- Bot.welcome_message - asosiy variant (A).
-- Bot.welcome_message_b - alternative variant (B). NULL bo'lsa A/B test o'chiq.
-- conversations.welcome_variant - mijoz qaysi variantni ko'rgan ('A' yoki 'B').
-- Stickiness: bir mijoz har doim bir xil variantni ko'radi (tg_user_id mod 2).

alter table public.bots
  add column if not exists welcome_message_b text default null;

alter table public.bots
  add column if not exists ab_test_started_at timestamptz default null;

alter table public.conversations
  add column if not exists welcome_variant char(1) default null
  check (welcome_variant in ('A', 'B') or welcome_variant is null);

create index if not exists idx_conv_ab_variant
  on public.conversations (bot_id, welcome_variant)
  where welcome_variant is not null;

-- A/B test natijalarini hisoblash uchun yordamchi function.
-- Qaytuv: variant bo'yicha conversations, orders, completed orders, revenue.
create or replace function public.ab_test_results(p_bot_id uuid, p_days int default 30)
returns table (
  variant char(1),
  conversations_count int,
  orders_count int,
  orders_completed int,
  revenue_uzs bigint
)
language sql stable as $$
  with conv as (
    select
      c.id,
      c.tg_user_id,
      c.welcome_variant
    from public.conversations c
    where c.bot_id = p_bot_id
      and c.welcome_variant in ('A', 'B')
      and c.created_at >= now() - (p_days * interval '1 day')
  )
  select
    conv.welcome_variant as variant,
    count(distinct conv.id)::int as conversations_count,
    count(distinct o.id) filter (where o.id is not null)::int as orders_count,
    count(distinct o.id) filter (where o.status = 'completed')::int as orders_completed,
    coalesce(sum(o.total_uzs) filter (where o.status = 'completed'), 0)::bigint as revenue_uzs
  from conv
  left join public.orders o on o.bot_id = p_bot_id
    and o.customer_tg_id = conv.tg_user_id
  group by conv.welcome_variant
  order by conv.welcome_variant;
$$;
