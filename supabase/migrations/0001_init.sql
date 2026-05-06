-- BotForge — Telegram bot builder schema
-- Hamma jadvallar `public` ichida, RLS yoqilgan, owner-based access.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =====================================================
-- USERS (Telegram-based)
-- =====================================================
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  telegram_username text,
  first_name text,
  last_name text,
  language_code text default 'uz',
  photo_url text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index if not exists idx_app_users_tg on public.app_users (telegram_id);

-- =====================================================
-- BOT TEMPLATES (system, read-only katalog)
-- =====================================================
create table if not exists public.bot_templates (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  icon text,
  default_system_prompt text not null,
  default_welcome text,
  default_buttons jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =====================================================
-- BOTS (foydalanuvchining yaratgan botlari)
-- =====================================================
create type bot_status as enum ('draft','active','paused','error');

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  template_id text references public.bot_templates(id),
  name text not null,
  business_name text,
  business_type text,
  language text default 'uz',
  status bot_status default 'draft',
  -- Telegram bot ma'lumoti (validate paytida olinadi)
  tg_bot_id bigint,
  tg_username text,
  tg_first_name text,
  webhook_secret text,
  -- AI configi
  ai_model text default 'gpt-4o-mini',
  system_prompt text,
  welcome_message text,
  admin_chat_id bigint,
  -- Limits
  monthly_message_limit int default 500,
  monthly_messages_used int default 0,
  -- Soft delete
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bots_owner on public.bots (owner_id) where deleted_at is null;
create unique index if not exists idx_bots_tg_unique on public.bots (tg_bot_id) where deleted_at is null and tg_bot_id is not null;

-- =====================================================
-- BOT_SECRETS (encrypted tokenlar — alohida jadval, RLS qattiq)
-- =====================================================
create table if not exists public.bot_secrets (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  encrypted_token text not null,
  iv text not null,
  auth_tag text not null,
  rotated_at timestamptz default now()
);

-- =====================================================
-- BOT_CONFIG_DATA (xizmatlar, narxlar, ish vaqti, FAQ)
-- =====================================================
create table if not exists public.bot_data (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  services jsonb default '[]'::jsonb,        -- [{name, price, duration}]
  working_hours jsonb default '{}'::jsonb,   -- {mon:[9,18], tue:[9,18], ...}
  contacts jsonb default '{}'::jsonb,        -- {phone, address, instagram}
  faq jsonb default '[]'::jsonb,             -- [{q, a}]
  custom_fields jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- =====================================================
-- CONVERSATIONS
-- =====================================================
create type conv_status as enum ('open','waiting_human','closed');

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  tg_chat_id bigint not null,
  tg_user_id bigint not null,
  customer_name text,
  customer_username text,
  customer_phone text,
  status conv_status default 'open',
  message_count int default 0,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists idx_conv_bot_chat on public.conversations (bot_id, tg_chat_id);
create index if not exists idx_conv_bot_status on public.conversations (bot_id, status, last_message_at desc);

-- =====================================================
-- MESSAGES
-- =====================================================
create type msg_role as enum ('user','assistant','system','tool');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  role msg_role not null,
  content text not null,
  tg_message_id bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_msg_conv on public.messages (conversation_id, created_at);
create index if not exists idx_msg_bot on public.messages (bot_id, created_at desc);

-- =====================================================
-- LEADS (mijoz aloqasi qoldirgan)
-- =====================================================
create type lead_status as enum ('new','contacted','converted','lost');

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  name text,
  phone text,
  request text,
  status lead_status default 'new',
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_leads_bot on public.leads (bot_id, created_at desc);

-- =====================================================
-- AI_USAGE (token va xarajat hisobi)
-- =====================================================
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  model text not null,
  prompt_tokens int default 0,
  completion_tokens int default 0,
  cost_usd numeric(10,6) default 0,
  created_at timestamptz default now()
);

create index if not exists idx_ai_usage_bot on public.ai_usage (bot_id, created_at desc);

-- =====================================================
-- WEBHOOK_LOGS (debug uchun, 7 kunda eski o‘chiriladi)
-- =====================================================
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.bots(id) on delete cascade,
  status int,
  error text,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_wh_logs_bot on public.webhook_logs (bot_id, created_at desc);

-- =====================================================
-- AUDIT LOG
-- =====================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  bot_id uuid references public.bots(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =====================================================
-- updated_at triggers
-- =====================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_bots_updated on public.bots;
create trigger trg_bots_updated before update on public.bots
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_bot_data_updated on public.bot_data;
create trigger trg_bot_data_updated before update on public.bot_data
  for each row execute function public.touch_updated_at();

-- =====================================================
-- BOT message counter trigger
-- =====================================================
create or replace function public.bump_conversation_counter()
returns trigger language plpgsql as $$
begin
  update public.conversations
     set message_count = message_count + 1,
         last_message_at = now()
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_msg_bump on public.messages;
create trigger trg_msg_bump after insert on public.messages
  for each row execute function public.bump_conversation_counter();
