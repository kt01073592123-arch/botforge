-- Promo kodlar: bot egasi yaratadi, mijoz Mini App'da kiritadi.
--
-- Format:
--   discount_type='percent' va discount_value=10 -> 10% chegirma
--   discount_type='fixed' va discount_value=20000 -> 20 000 so'm chegirma
--
-- Cheklovlar:
--   - max_uses (NULL = cheksiz)
--   - valid_until (NULL = muddatsiz)
--   - min_order_uzs (NULL = minimumsiz)
--
-- Foydalanish tarixi promo_code_uses jadvalida saqlanadi (mijoz qaysi buyurtmada qaysi kodni ishlatgan).

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value int not null check (discount_value > 0),
  min_order_uzs int,
  max_uses int,
  used_count int default 0,
  valid_until timestamptz,
  is_active boolean default true,
  description text,
  created_at timestamptz default now(),
  unique (bot_id, code)
);

create index if not exists idx_promo_bot on public.promo_codes (bot_id, is_active);
create index if not exists idx_promo_code on public.promo_codes (lower(code));

create table if not exists public.promo_code_uses (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  customer_tg_id bigint,
  customer_phone text,
  order_id uuid references public.orders(id) on delete set null,
  discount_uzs int not null,
  created_at timestamptz default now()
);

create index if not exists idx_promo_uses_code on public.promo_code_uses (promo_code_id, created_at desc);
create index if not exists idx_promo_uses_customer on public.promo_code_uses (customer_tg_id, bot_id);

-- Validate function: kodni tekshirib, agar ishlatilishi mumkin bo'lsa chegirma qaytaradi.
-- Qaytuv: jsonb {valid: bool, discount_uzs: int, error?: text, code_id?: uuid}
create or replace function public.validate_promo_code(
  p_bot_id uuid,
  p_code text,
  p_order_total int,
  p_customer_tg_id bigint default null
) returns jsonb
language plpgsql stable as $$
declare
  rec record;
  discount_amt int;
  prev_use int;
begin
  select * into rec
    from public.promo_codes
   where bot_id = p_bot_id
     and lower(code) = lower(p_code)
     and is_active
   limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'error', 'Bunday kod topilmadi');
  end if;

  if rec.valid_until is not null and rec.valid_until < now() then
    return jsonb_build_object('valid', false, 'error', 'Kod muddati tugagan');
  end if;

  if rec.max_uses is not null and rec.used_count >= rec.max_uses then
    return jsonb_build_object('valid', false, 'error', 'Kod ishlatilib bo''lingan');
  end if;

  if rec.min_order_uzs is not null and p_order_total < rec.min_order_uzs then
    return jsonb_build_object(
      'valid', false,
      'error', 'Minimal buyurtma summasi: ' || rec.min_order_uzs::text || ' so''m'
    );
  end if;

  -- Bir mijoz bir kod faqat 1 marta ishlatishi (agar tg_id berilgan bo'lsa)
  if p_customer_tg_id is not null then
    select count(*) into prev_use
      from public.promo_code_uses
     where promo_code_id = rec.id
       and customer_tg_id = p_customer_tg_id;
    if prev_use > 0 then
      return jsonb_build_object('valid', false, 'error', 'Siz bu kodni allaqachon ishlatgansiz');
    end if;
  end if;

  -- Hisoblash
  if rec.discount_type = 'percent' then
    discount_amt := round(p_order_total * rec.discount_value / 100.0);
  else
    discount_amt := rec.discount_value;
  end if;
  if discount_amt > p_order_total then discount_amt := p_order_total; end if;

  return jsonb_build_object(
    'valid', true,
    'code_id', rec.id,
    'discount_uzs', discount_amt,
    'discount_type', rec.discount_type,
    'discount_value', rec.discount_value
  );
end $$;
