-- Knowledge base + pgvector. Neon’da `vector` extension qo‘llab-quvvatlanadi.

create extension if not exists vector;

create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  title text not null,
  source text default 'manual',
  source_meta jsonb default '{}',
  content text,
  status text default 'ready',
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
create index if not exists idx_kb_chunks_emb on public.kb_chunks
  using hnsw (embedding vector_cosine_ops);

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
language sql stable as $$
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
