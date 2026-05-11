import postgres from "postgres";
import { readFileSync } from "fs";
const sql = postgres(process.env.DB_URL, { ssl: "require", max: 1 });
const file = readFileSync("supabase/migrations/0024_bot_custom_buttons.sql", "utf8");
try {
  await sql.unsafe(file);
  console.log("OK 0024 applied");
  const r = await sql`select column_name, data_type from information_schema.columns where table_name='bot_data' and column_name='custom_buttons'`;
  console.log(JSON.stringify(r, null, 2));
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
