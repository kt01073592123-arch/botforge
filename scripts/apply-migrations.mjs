// Migration’larni ketma-ket qo‘llaydi.
// node scripts/apply-migrations.mjs "<DATABASE_URL>"

import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL kerak");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });
const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const f of files) {
  const path = join(dir, f);
  const content = readFileSync(path, "utf8");
  process.stdout.write(`→ ${f}... `);
  try {
    await sql.unsafe(content);
    console.log("ok");
  } catch (e) {
    console.log("FAIL");
    console.error(e.message);
    process.exit(1);
  }
}

await sql.end();
console.log("\n✓ Hammasi qo‘llandi");
