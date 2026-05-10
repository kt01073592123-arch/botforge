import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function POST(req: Request) {
  if (req.headers.get("x-migrate-secret") !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const file = readFileSync(
      join(process.cwd(), "supabase", "migrations", "0027_marketplace.sql"),
      "utf8",
    );
    const s = sql();
    await s.unsafe(file);
    const cols = await s`
      select column_name from information_schema.columns
       where table_name = 'bots' and column_name in ('is_public', 'description', 'explore_category')
    `;
    return NextResponse.json({ ok: true, bots_cols: cols });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
