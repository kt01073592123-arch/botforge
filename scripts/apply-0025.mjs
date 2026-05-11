import postgres from "postgres";
import { readFileSync } from "fs";
const sql = postgres(process.env.DB_URL, { ssl: "require", max: 1 });
const file = readFileSync("supabase/migrations/0025_promo_codes.sql", "utf8");
try {
  await sql.unsafe(file);
  console.log("OK 0025 applied");
  const r = await sql`select column_name from information_schema.columns where table_name='promo_codes' order by ordinal_position`;
  console.log("promo_codes columns:", r.map(x => x.column_name).join(", "));
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
