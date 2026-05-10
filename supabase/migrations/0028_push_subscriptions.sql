-- Web Push subscriptions: mijozlar Mini App'da "ruxsat" bersa shu yerga yoziladi.
-- Buyurtma statusi o'zgarganda runtime push yuboradi.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  customer_tg_id bigint,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  unique (bot_id, endpoint)
);

create index if not exists idx_push_bot_tg on public.push_subscriptions (bot_id, customer_tg_id);
create index if not exists idx_push_endpoint on public.push_subscriptions (endpoint);
