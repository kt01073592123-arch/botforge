-- Fixed-window rate limit Supabase'da. Yangi servis kerak emas.
-- 3 ta scope: bot (per chat), api (per IP), admin (per user uuid).

create table if not exists public.rate_limits (
  scope text not null,                 -- 'tg_chat', 'api_ip', 'api_user'
  key text not null,                   -- bot_id|chat_id, ip, user_id
  window_started_at timestamptz not null,
  count int not null default 0,
  primary key (scope, key, window_started_at)
);

create index if not exists idx_rl_window on public.rate_limits (window_started_at);

-- Atomic check: agar limit oshmagan bo‘lsa hisoblagichni 1 ga oshirib true qaytaradi.
-- window — sekundlarda. limit — shu window ichidagi ruxsat etilgan max.
create or replace function public.rate_limit_check(
  p_scope text,
  p_key text,
  p_window_seconds int,
  p_limit int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz;
  cur int;
begin
  bucket := date_trunc('second', now()) -
            ((extract(epoch from now())::int % p_window_seconds) || ' seconds')::interval;

  insert into public.rate_limits(scope, key, window_started_at, count)
  values (p_scope, p_key, bucket, 1)
  on conflict (scope, key, window_started_at)
  do update set count = public.rate_limits.count + 1
  returning count into cur;

  return cur <= p_limit;
end $$;

grant execute on function public.rate_limit_check(text, text, int, int) to service_role, authenticated, anon;

-- Eski windowlarni tozalash (cron har soat)
create or replace function public.rate_limit_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_started_at < now() - interval '1 hour';
$$;

grant execute on function public.rate_limit_cleanup() to service_role;
