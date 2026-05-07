-- Broadcast queue.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'bcast_status') then
    create type bcast_status as enum ('draft','queued','sending','done','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'bcast_segment') then
    create type bcast_segment as enum ('all','leads','converted','no_lead');
  end if;
  if not exists (select 1 from pg_type where typname = 'bcast_recipient_status') then
    create type bcast_recipient_status as enum ('pending','sent','failed');
  end if;
end $$;

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  text text not null,
  segment bcast_segment default 'all',
  status bcast_status default 'draft',
  total_recipients int default 0,
  sent_count int default 0,
  failed_count int default 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_bc_bot on public.broadcasts (bot_id, created_at desc);

create table if not exists public.broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  tg_chat_id bigint not null,
  status bcast_recipient_status default 'pending',
  error text,
  sent_at timestamptz,
  attempts int default 0
);

create index if not exists idx_br_status on public.broadcast_recipients (status, broadcast_id);
create index if not exists idx_br_pending on public.broadcast_recipients (broadcast_id) where status = 'pending';

create or replace function public.broadcast_enqueue(p_broadcast_id uuid)
returns int language plpgsql as $$
declare
  v_bot uuid;
  v_seg bcast_segment;
  v_count int;
begin
  select bot_id, segment into v_bot, v_seg from public.broadcasts where id = p_broadcast_id;
  if v_bot is null then return 0; end if;

  if v_seg = 'all' then
    insert into public.broadcast_recipients (broadcast_id, bot_id, tg_chat_id)
    select p_broadcast_id, v_bot, c.tg_chat_id
      from public.conversations c
     where c.bot_id = v_bot
     group by c.tg_chat_id;
  elsif v_seg = 'leads' then
    insert into public.broadcast_recipients (broadcast_id, bot_id, tg_chat_id)
    select p_broadcast_id, v_bot, c.tg_chat_id
      from public.conversations c
     where c.bot_id = v_bot
       and exists (select 1 from public.leads l where l.bot_id = v_bot and l.conversation_id = c.id)
     group by c.tg_chat_id;
  elsif v_seg = 'converted' then
    insert into public.broadcast_recipients (broadcast_id, bot_id, tg_chat_id)
    select p_broadcast_id, v_bot, c.tg_chat_id
      from public.conversations c
     where c.bot_id = v_bot
       and exists (select 1 from public.leads l
                    where l.bot_id = v_bot and l.conversation_id = c.id and l.status = 'converted')
     group by c.tg_chat_id;
  elsif v_seg = 'no_lead' then
    insert into public.broadcast_recipients (broadcast_id, bot_id, tg_chat_id)
    select p_broadcast_id, v_bot, c.tg_chat_id
      from public.conversations c
     where c.bot_id = v_bot
       and not exists (select 1 from public.leads l where l.bot_id = v_bot and l.conversation_id = c.id)
     group by c.tg_chat_id;
  end if;

  select count(*) into v_count from public.broadcast_recipients where broadcast_id = p_broadcast_id;
  update public.broadcasts
     set total_recipients = v_count,
         status = 'queued',
         scheduled_at = now()
   where id = p_broadcast_id;
  return v_count;
end $$;
