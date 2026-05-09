-- 0019 — Bot Doctor: AI-based suhbat tahlili va prompt yaxshilash takliflari.
-- Har hafta cron yordamida ishga tushadi, har bot uchun "doktor xulosasi" yozadi.

create table if not exists public.bot_diagnostics (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  -- Davr
  period_start timestamptz not null,
  period_end timestamptz not null,
  -- Statistika
  total_conversations int default 0,
  total_messages int default 0,
  total_leads int default 0,
  total_bookings int default 0,
  total_orders int default 0,
  -- AI tahlili (JSON)
  insights jsonb default '{}',  -- {top_questions, missing_info, satisfaction, conversion_pct}
  suggestions jsonb default '[]',  -- [{type, severity, title, before, after, rationale}]
  -- Status
  reviewed boolean default false,
  reviewed_at timestamptz,
  applied_count int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_bot_diagnostics_bot on public.bot_diagnostics (bot_id, created_at desc);
create index if not exists idx_bot_diagnostics_unreviewed on public.bot_diagnostics (bot_id, reviewed)
  where reviewed = false;

-- Doktor takliflarini "qabul qilingan" deb belgilash
create or replace function public.apply_diagnostic_suggestion(
  p_diag_id uuid,
  p_suggestion_index int
) returns void
language sql as $$
  update public.bot_diagnostics
  set applied_count = applied_count + 1,
      reviewed = true,
      reviewed_at = coalesce(reviewed_at, now())
  where id = p_diag_id;
$$;
