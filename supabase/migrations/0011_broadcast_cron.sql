-- Vercel Hobby plan’i daqiqali cron’ni qo‘llab-quvvatlamaydi.
-- Yechim: Supabase pg_cron + pg_net orqali har daqiqada Vercel endpoint’ini chaqiramiz.
--
-- ❗ Buni qo‘llashdan oldin Supabase Dashboard → Database → Extensions
-- bo‘limidan `pg_net` extension’ni yoqing.

create extension if not exists pg_net;

-- Webhook URL va secret’ni vault’da saqlash kerak edi, lekin Supabase free
-- plan’da vault sodda. Shuning uchun sozlamalarni alohida funksiyaga qattiq yozamiz —
-- siz uni ham SETUP da yangilash uchun yo‘riqnoma topasiz.

create or replace function public.broadcast_tick()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  app_url text;
  cron_secret text;
begin
  -- Bu qiymatlarni Supabase'da Database → Settings → DB Custom Config dan
  -- yoki bevosita shu funksiyani edit qilib o‘rnating.
  select coalesce(current_setting('app.botforge_url', true),
                  'https://botforge-beige.vercel.app') into app_url;
  select coalesce(current_setting('app.botforge_cron_secret', true), '') into cron_secret;

  perform net.http_get(
    url := app_url || '/api/cron/broadcast',
    headers := case when cron_secret <> ''
               then jsonb_build_object('Authorization', 'Bearer ' || cron_secret)
               else '{}'::jsonb end
  );
end $$;

grant execute on function public.broadcast_tick() to service_role;

-- Har daqiqada
do $$
begin
  perform cron.unschedule('botforge_broadcast_tick')
  where exists (select 1 from cron.job where jobname = 'botforge_broadcast_tick');
exception when others then null;
end $$;

select cron.schedule(
  'botforge_broadcast_tick',
  '* * * * *',
  $$select public.broadcast_tick();$$
);

-- App URL/Secret’ni o‘rnatish (siz uchun, kerak bo‘lsa):
-- alter database postgres set app.botforge_url = 'https://botforge-beige.vercel.app';
-- alter database postgres set app.botforge_cron_secret = '<sizning secret>';
