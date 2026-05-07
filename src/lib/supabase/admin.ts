// Compat — endi Neon’ga ulanyapmiz. adminClient() ga to‘g‘ridan to‘g‘ri murojaat
// qilinadigan joy yo‘q (db() ishlatiladi), lekin import xato bermasligi uchun saqlaymiz.

export { db as adminClient } from "../db";
