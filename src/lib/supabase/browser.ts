// Browserda Supabase ishlatilmaydi (server actions/API routes orqali ishlaymiz).
// Eski importlar singan bo‘lmasligi uchun bo‘sh export.

export function browserClient() {
  throw new Error("browserClient endi ishlatilmaydi — server API’dan foydalaning");
}
