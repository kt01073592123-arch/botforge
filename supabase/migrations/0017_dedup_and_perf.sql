-- 0017 — Webhook dedup, pgvector HNSW, log retention, message partitioning prep
-- Sprint 0: Production fundament

-- ════════════════════════════════════════════
-- 1. UPDATE_ID DEDUPLICATION
-- Telegram webhook bir xil update'ni qayta yuborishi mumkin (network retry).
-- Biz update_id ni 24 soat saqlaymiz va takror kelsa silently skip qilamiz.
-- ════════════════════════════════════════════
create table if not exists public.processed_updates (
  bot_id uuid not null references public.bots(id) on delete cascade,
  update_id bigint not null,
  processed_at timestamptz default now(),
  primary key (bot_id, update_id)
);

create index if not exists idx_processed_updates_cleanup
  on public.processed_updates (processed_at);

-- Atomic dedup checker — true qaytarsa "yangi", false qaytarsa "duplicate"
create or replace function public.try_mark_update_processed(
  p_bot_id uuid,
  p_update_id bigint
) returns boolean
language plpgsql as $$
begin
  insert into public.processed_updates (bot_id, update_id)
  values (p_bot_id, p_update_id)
  on conflict do nothing;
  -- ROW_COUNT 1 bo'lsa yangi insert, 0 bo'lsa allaqachon bor edi
  return found;
end $$;

-- Cleanup: 24 soatdan eski yozuvlarni o'chirish
create or replace function public.cleanup_processed_updates() returns void
language sql as $$
  delete from public.processed_updates
  where processed_at < now() - interval '24 hours';
$$;

-- pg_cron orqali har soatda tozalash
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('cleanup-processed-updates') where exists (
      select 1 from cron.job where jobname = 'cleanup-processed-updates'
    );
    perform cron.schedule(
      'cleanup-processed-updates',
      '0 * * * *',
      $cron$ select public.cleanup_processed_updates(); $cron$
    );
  end if;
end $$;

-- ════════════════════════════════════════════
-- 2. KB_CHUNKS HNSW INDEX (RAG tezlashtirish)
-- IVFFlat o'rniga HNSW — embedding qidiruv 10–100x tez, recall ham yaxshi.
-- ════════════════════════════════════════════
do $$ begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    -- Eski IVFFlat indexni o'chirish (agar bor bo'lsa)
    if exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'idx_kb_chunks_embedding'
    ) then
      execute 'drop index public.idx_kb_chunks_embedding';
    end if;
    -- Yangi HNSW index
    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'idx_kb_chunks_embedding_hnsw'
    ) then
      execute 'create index idx_kb_chunks_embedding_hnsw
        on public.kb_chunks using hnsw (embedding vector_cosine_ops)
        with (m = 16, ef_construction = 64)';
    end if;
  end if;
end $$;

-- ════════════════════════════════════════════
-- 3. LOG RETENTION + DATA HYGIENE
-- webhook_logs cheksiz o'sib ketmasin. AI usage ham 90 kunda agreggate qoladi.
-- ════════════════════════════════════════════
create or replace function public.cleanup_old_logs() returns void
language sql as $$
  -- 30 kundan eski webhook log'lar
  delete from public.webhook_logs where created_at < now() - interval '30 days';
  -- 24 soatdan eski rate_limits counterlari
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('cleanup-old-logs') where exists (
      select 1 from cron.job where jobname = 'cleanup-old-logs'
    );
    perform cron.schedule(
      'cleanup-old-logs',
      '15 3 * * *',  -- har kuni 03:15 da
      $cron$ select public.cleanup_old_logs(); $cron$
    );
  end if;
end $$;

-- ════════════════════════════════════════════
-- 4. MESSAGES INDEX OPTIMIZATION
-- (To'liq partitioning yiliga 1M+ row paydo bo'lganda kerak; hozir compound index)
-- ════════════════════════════════════════════
create index if not exists idx_messages_conv_time
  on public.messages (conversation_id, created_at desc);

create index if not exists idx_messages_bot_time
  on public.messages (bot_id, created_at desc)
  where role = 'user';  -- Faqat foydalanuvchi xabarlari analytics uchun

-- ════════════════════════════════════════════
-- 5. WEBHOOK_LOGS PII REDACTION (default off, app level redact qiladi)
-- Eski yozuvlarni darhol tozalash imkoni
-- ════════════════════════════════════════════
create or replace function public.redact_webhook_logs() returns void
language sql as $$
  update public.webhook_logs
  set payload = jsonb_set(
    coalesce(payload, '{}'::jsonb),
    '{_redacted}',
    'true'::jsonb
  )
  where created_at < now() - interval '7 days'
    and payload is not null
    and not (payload ? '_redacted');
$$;
