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
      join(process.cwd(), "supabase", "migrations", "0028_push_subscriptions.sql"),
      "utf8",
    );
    const s = sql();
    await s.unsafe(file);
    const tables = await s`
      select table_name from information_schema.tables
       where table_schema = 'public' and table_name = 'push_subscriptions'
    `;
    return NextResponse.json({ ok: true, tables });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
