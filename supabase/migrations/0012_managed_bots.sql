-- Telegram Managed Bots (Bot API 9.6) flow uchun.
-- request_managed_bot tugmasi bosilgandan keyin draft botni "pending" holatida saqlaymiz.
-- managed_bot updatei kelganda creator telegram_id orqali topib token bog‘laymiz.

alter table public.bots
  add column if not exists managed_request_id integer,
  add column if not exists managed_pending_at timestamptz,
  add column if not exists creation_method text default 'manual'; -- 'manual' | 'managed'

-- Pending qidiruv uchun index
create index if not exists idx_bots_managed_pending
  on public.bots (owner_id, managed_pending_at desc)
  where managed_pending_at is not null and tg_bot_id is null and deleted_at is null;
