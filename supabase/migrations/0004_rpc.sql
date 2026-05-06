-- Atomic message counter

create or replace function public.increment_bot_messages(p_bot_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bots
     set monthly_messages_used = monthly_messages_used + 1
   where id = p_bot_id;
$$;

revoke all on function public.increment_bot_messages(uuid) from public;
grant execute on function public.increment_bot_messages(uuid) to authenticated, service_role, anon;

-- Bot statistikasi
create or replace function public.bot_stats(p_bot_id uuid)
returns table (
  conversations_total bigint,
  conversations_today bigint,
  leads_total bigint,
  leads_today bigint,
  messages_today bigint,
  cost_usd_30d numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.conversations where bot_id = p_bot_id) as conversations_total,
    (select count(*) from public.conversations where bot_id = p_bot_id and created_at::date = current_date) as conversations_today,
    (select count(*) from public.leads where bot_id = p_bot_id) as leads_total,
    (select count(*) from public.leads where bot_id = p_bot_id and created_at::date = current_date) as leads_today,
    (select count(*) from public.messages where bot_id = p_bot_id and created_at::date = current_date) as messages_today,
    coalesce((select sum(cost_usd) from public.ai_usage where bot_id = p_bot_id and created_at > now() - interval '30 days'), 0) as cost_usd_30d
$$;

grant execute on function public.bot_stats(uuid) to authenticated, service_role, anon;
