-- Neon: RLS yo‘q. Ownership/permissionlar Next.js API route ichida tekshiriladi.
-- Bu fayl avval Supabase RLS uchun edi. Neon’da hech narsa qilmaydi.
-- (Aslida bu faylni butunlay o‘tkazib yuborsa ham bo‘ladi.)

-- Eski boshlang‘ich versiyadan qoladigan funksiya — boshqa migration’lar referens qilishi mumkin.
create or replace function public.current_app_user_id()
returns uuid language sql stable as $$
  select null::uuid
$$;
