-- Oylik reset funksiyasi.
-- Neon: pg_cron Pro tarifda mavjud. Free’da Vercel Cron yoki cron-job.org orqali
-- /api/cron/monthly-reset endpoint’ini chaqiramiz (vercel.json cron daily configured).

create or replace function public.reset_monthly_counters() returns void
language sql as $$
  update public.bots set monthly_messages_used = 0;
  delete from public.rate_limits where window_started_at < now() - interval '24 hours';
  delete from public.webhook_logs where created_at < now() - interval '7 days';
$$;
