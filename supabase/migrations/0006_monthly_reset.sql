-- Oylik xabar hisoblagichini har oyning 1-kunida 0 ga tushiruvchi cron.
-- pg_cron Supabase'da bepul tarifda mavjud (Database > Extensions > pg_cron).

create extension if not exists pg_cron;

-- Reset funksiyasi
create or replace function public.reset_monthly_counters() returns void
language sql security definer set search_path = public as $$
  update public.bots set monthly_messages_used = 0;
  delete from public.rate_limits where window_started_at < now() - interval '24 hours';
  delete from public.webhook_logs where created_at < now() - interval '7 days';
$$;

grant execute on function public.reset_monthly_counters() to service_role;

-- Cron — har oyning 1-kuni 00:05 UTC
do $$
begin
  -- mavjud bo‘lsa o‘chirib tashlaymiz, keyin qaytadan
  perform cron.unschedule('botforge_monthly_reset')
  where exists (select 1 from cron.job where jobname = 'botforge_monthly_reset');
exception when others then null;
end $$;

select cron.schedule(
  'botforge_monthly_reset',
  '5 0 1 * *',
  $$select public.reset_monthly_counters();$$
);

-- Soatlik tozalash (rate limit oynalari)
do $$
begin
  perform cron.unschedule('botforge_hourly_cleanup')
  where exists (select 1 from cron.job where jobname = 'botforge_hourly_cleanup');
exception when others then null;
end $$;

select cron.schedule(
  'botforge_hourly_cleanup',
  '0 * * * *',
  $$select public.rate_limit_cleanup();$$
);
