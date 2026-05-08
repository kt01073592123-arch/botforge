-- Adminlar uchun bot limit bypass.
-- app_users.is_admin = true bo‘lsa, tarif chegarasini chetlab o‘tadi.

create or replace function public.check_bot_limit(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select is_admin from public.app_users where id = p_user_id), false) then true
    else (select count(*) from public.bots where owner_id = p_user_id and deleted_at is null) <
         coalesce((select p.bot_limit
                   from public.subscriptions s
                   join public.plans p on p.id = s.plan_id
                   where s.user_id = p_user_id and s.active), 1)
  end;
$$;
