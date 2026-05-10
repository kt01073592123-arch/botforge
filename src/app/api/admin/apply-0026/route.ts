// BIR MARTALIK: 0026_welcome_ab_test.sql ni qo'llaydi.

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
      join(process.cwd(), "supabase", "migrations", "0026_welcome_ab_test.sql"),
      "utf8",
    );
    const s = sql();
    await s.unsafe(file);
    const cols = await s`
      select column_name from information_schema.columns
       where table_name = 'bots' and column_name in ('welcome_message_b', 'ab_test_started_at')
    `;
    const conv = await s`
      select column_name from information_schema.columns
       where table_name = 'conversations' and column_name = 'welcome_variant'
    `;
    return NextResponse.json({ ok: true, bots_cols: cols, conv_col: conv });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
