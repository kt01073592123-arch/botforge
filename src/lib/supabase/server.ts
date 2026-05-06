// Server-side Supabase klient: hozirgi sessiya bilan.
// RLS uchun custom JWT ni Authorization header sifatida uzatamiz, lekin Supabase
// `auth` API si custom HS256 ni qabul qilishi uchun JWT_SECRET serverda mos bo‘lishi kerak.
//
// MVP uchun yondashuv: server kodida data manipulyatsiyani SERVICE ROLE klient bilan
// qilamiz, lekin har doim `owner_id = currentUser.id` filtrini qo‘yamiz. Bu RLS ni
// dublikat qilib, ortiqcha xavfsizlik beradi. Foydalanuvchi server actions yoki API
// route ichida bevosita Supabase ga yozmaydi.

import { adminClient } from "./admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export function db(): SupabaseClient {
  return adminClient();
}
