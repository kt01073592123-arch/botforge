-- Mahsulot rasm qidirish uchun vektor embedding jadvali.
-- Har bir bot xizmati uchun name+description embedding saqlanadi.
-- Foydalanuvchi rasm yuborsa: Claude Vision tavsif → OpenAI embed → cosine search.

create extension if not exists vector;

create table if not exists public.product_image_embeddings (
  id           uuid primary key default gen_random_uuid(),
  bot_id       uuid not null references public.bots(id) on delete cascade,
  product_idx  int  not null,
  product_name text not null,
  description  text,
  photo_url    text,
  embedding    vector(1536),
  updated_at   timestamptz default now(),
  unique (bot_id, product_idx)
);

create index if not exists idx_pie_bot on public.product_image_embeddings (bot_id);

create index if not exists idx_pie_emb
  on public.product_image_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Cosine similarity qidirish funksiyasi
create or replace function public.search_products_by_embedding(
  p_bot_id    uuid,
  p_embedding vector(1536),
  p_limit     int   default 5,
  p_min_sim   float default 0.25
) returns table (
  product_idx  int,
  product_name text,
  description  text,
  photo_url    text,
  similarity   float
) language sql stable as $$
  select
    product_idx,
    product_name,
    description,
    photo_url,
    (1 - (embedding <=> p_embedding))::float as similarity
  from public.product_image_embeddings
  where bot_id   = p_bot_id
    and embedding is not null
    and (1 - (embedding <=> p_embedding)) >= p_min_sim
  order by embedding <=> p_embedding
  limit p_limit;
$$;
