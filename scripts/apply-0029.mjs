import postgres from "postgres";
import { readFileSync } from "fs";
const sql = postgres(process.env.DB_URL, { ssl: "require", max: 1 });
const file = readFileSync("supabase/migrations/0029_product_image_search.sql", "utf8");
try {
  await sql.unsafe(file);
  console.log("OK 0029 applied");
  const r = await sql`select column_name, data_type from information_schema.columns where table_name='product_image_embeddings' order by ordinal_position`;
  console.log(r.map(x => `${x.column_name}:${x.data_type}`).join(", "));
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
