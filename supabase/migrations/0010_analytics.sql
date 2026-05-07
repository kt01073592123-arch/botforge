-- Kunlik agregat — analytics uchun.

create or replace function public.bot_daily_stats(p_bot_id uuid, p_days int default 30)
returns table (
  day date,
  conversations int,
  leads int,
  messages int,
  cost_usd numeric
)
language sql stable security definer set search_path = public as $$
  with d as (
    select generate_series(current_date - (p_days - 1), current_date, '1 day')::date as day
  )
  select
    d.day,
    coalesce((select count(*)::int from public.conversations c
              where c.bot_id = p_bot_id and c.created_at::date = d.day), 0) as conversations,
    coalesce((select count(*)::int from public.leads l
              where l.bot_id = p_bot_id and l.created_at::date = d.day), 0) as leads,
    coalesce((select count(*)::int from public.messages m
              where m.bot_id = p_bot_id and m.created_at::date = d.day), 0) as messages,
    coalesce((select sum(cost_usd) from public.ai_usage u
              where u.bot_id = p_bot_id and u.created_at::date = d.day), 0) as cost_usd
  from d
  order by d.day;
$$;

grant execute on function public.bot_daily_stats(uuid, int) to service_role, authenticated, anon;
