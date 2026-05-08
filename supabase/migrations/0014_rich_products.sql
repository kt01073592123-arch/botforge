-- Mahsulot/xizmat ma'lumotlarini boyitish: rasm, tavsif, kategoriya.
-- bot_data.services jsonb formatida saqlanyapti — schema o'zgarmaydi, faqat
-- yangi maydonlar qabul qilinadi (yumshoq migratsiya).
--
-- Yangi shape (eski bilan moslashgan):
-- {
--   name: string,
--   price: string,            // "250 000 so'm" yoki "Bepul"
--   duration?: string,
--   description?: string,     // YANGI: 1-3 jumla tavsif
--   photo_url?: string,       // YANGI: rasm URL (ixtiyoriy)
--   category_id?: string,     // YANGI: bot_data.categories ichidagi id
--   in_stock?: boolean        // YANGI: false = chiqib turibdi (default true)
-- }

-- Kategoriya ro'yxati ham bot_data ichida saqlanadi (alohida jadval shart emas)
-- bot_data.categories: [{id, name, position, icon?}]

-- Schema o'zgarishi yo'q — jsonb shape juda moslashuvchan.
-- Faqat indeks samaradorligi uchun GIN index qo'shish mumkin.
create index if not exists idx_bot_data_services_gin on public.bot_data using gin (services);
