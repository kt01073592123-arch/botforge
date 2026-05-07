-- Knowledge base (RAG) — har bir botga tegishli matn fragmentlari va embeddinglar.

create extension if not exists vector;

create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  title text not null,
  source text default 'manual',     -- 'manual' | 'file' | 'url'
  source_meta jsonb default '{}',
  content text,                     -- to‘liq asl matn
  status text default 'ready',      -- 'pending' | 'ready' | 'error'
  error text,
  created_at timestamptz default now()
);

create index if not exists idx_kb_doc_bot on public.kb_documents (bot_id, created_at desc);

create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  ord int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists idx_kb_chunks_doc on public.kb_chunks (document_id, ord);
-- HNSW eng yaxshi tezlik. Cosine bilan ishlatamiz.
create index if not exists idx_kb_chunks_emb on public.kb_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.kb_documents enable row level security;
alter table public.kb_chunks    enable row level security;

drop policy if exists kb_doc_owner on public.kb_documents;
create policy kb_doc_owner on public.kb_documents for all
  using (exists (select 1 from public.bots b where b.id = kb_documents.bot_id and b.owner_id = public.current_app_user_id()))
  with check (exists (select 1 from public.bots b where b.id = kb_documents.bot_id and b.owner_id = public.current_app_user_id()));

drop policy if exists kb_chunk_owner on public.kb_chunks;
create policy kb_chunk_owner on public.kb_chunks for all
  using (exists (select 1 from public.bots b where b.id = kb_chunks.bot_id and b.owner_id = public.current_app_user_id()))
  with check (exists (select 1 from public.bots b where b.id = kb_chunks.bot_id and b.owner_id = public.current_app_user_id()));

-- Vector qidiruv RPC: bot uchun top-K eng yaqin chunk
create or replace function public.kb_match(
  p_bot_id uuid,
  p_query vector(1536),
  p_match_count int default 3,
  p_min_similarity float default 0.5
) returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable security definer set search_path = public as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> p_query) as similarity
  from public.kb_chunks c
  where c.bot_id = p_bot_id
    and c.embedding is not null
    and 1 - (c.embedding <=> p_query) >= p_min_similarity
  order by c.embedding <=> p_query
  limit p_match_count
$$;

grant execute on function public.kb_match(uuid, vector, int, float) to service_role, authenticated, anon;
