-- Fixed-window rate limit (Neon’da ham xuddi shunday ishlaydi).

create table if not exists public.rate_limits (
  scope text not null,
  key text not null,
  window_started_at timestamptz not null,
  count int not null default 0,
  primary key (scope, key, window_started_at)
);

create index if not exists idx_rl_window on public.rate_limits (window_started_at);

create or replace function public.rate_limit_check(
  p_scope text,
  p_key text,
  p_window_seconds int,
  p_limit int
) returns boolean
language plpgsql
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

create or replace function public.rate_limit_cleanup() returns void
language sql as $$
  delete from public.rate_limits where window_started_at < now() - interval '1 hour';
$$;
