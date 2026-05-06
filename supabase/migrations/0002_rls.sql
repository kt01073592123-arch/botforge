-- RLS policies — har bir foydalanuvchi faqat o‘z botlarini ko‘radi.
-- Auth: server-side cookie-based JWT. JWT ichida `sub` = app_users.id (uuid).

alter table public.app_users     enable row level security;
alter table public.bots          enable row level security;
alter table public.bot_secrets   enable row level security;
alter table public.bot_data      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.leads         enable row level security;
alter table public.ai_usage      enable row level security;
alter table public.webhook_logs  enable row level security;
alter table public.audit_log     enable row level security;
alter table public.bot_templates enable row level security;

-- Templatelar hammaga ochiq (read-only)
drop policy if exists tmpl_read on public.bot_templates;
create policy tmpl_read on public.bot_templates for select using (true);

-- =====================================================
-- Helper: hozirgi foydalanuvchi (custom JWT da `sub` = app_users.id)
-- =====================================================
create or replace function public.current_app_user_id()
returns uuid language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

-- =====================================================
-- app_users
-- =====================================================
drop policy if exists au_select on public.app_users;
create policy au_select on public.app_users for select
  using (id = public.current_app_user_id());

-- =====================================================
-- bots
-- =====================================================
drop policy if exists bots_owner_all on public.bots;
create policy bots_owner_all on public.bots for all
  using (owner_id = public.current_app_user_id())
  with check (owner_id = public.current_app_user_id());

-- =====================================================
-- bot_secrets — faqat egasiga ko‘rinadi (lekin token mask qilingan ko‘rinishda)
-- =====================================================
drop policy if exists secrets_owner on public.bot_secrets;
create policy secrets_owner on public.bot_secrets for all
  using (
    exists (select 1 from public.bots b
            where b.id = bot_secrets.bot_id
              and b.owner_id = public.current_app_user_id())
  )
  with check (
    exists (select 1 from public.bots b
            where b.id = bot_secrets.bot_id
              and b.owner_id = public.current_app_user_id())
  );

-- =====================================================
-- bot_data, conversations, messages, leads, ai_usage, webhook_logs
-- =====================================================
do $$
declare t text;
begin
  for t in select unnest(array['bot_data','conversations','messages','leads','ai_usage','webhook_logs']) loop
    execute format('drop policy if exists %I_owner on public.%I', t, t);
    execute format($p$create policy %I_owner on public.%I for all
      using (exists (select 1 from public.bots b where b.id = %I.bot_id and b.owner_id = public.current_app_user_id()))
      with check (exists (select 1 from public.bots b where b.id = %I.bot_id and b.owner_id = public.current_app_user_id()))$p$,
      t, t, t, t);
  end loop;
end $$;

-- audit_log — egasiga read only
drop policy if exists audit_owner on public.audit_log;
create policy audit_owner on public.audit_log for select
  using (user_id = public.current_app_user_id());
