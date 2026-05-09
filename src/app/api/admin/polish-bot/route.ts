// BIR MARTALIK: berilgan tg_username uchun applyBotPolish chaqiradi.
// Qo'llanildi → fayl o'chiriladi.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { applyBotPolish } from "@/lib/bot_polish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const username = url.searchParams.get("bot");
  if (!username) {
    return NextResponse.json({ error: "bot param required" }, { status: 400 });
  }
  try {
    const s = sql();
    const rows = (await s`
      select id from public.bots where tg_username = ${username} limit 1
    `) as Array<{ id: string }>;
    if (rows.length === 0) {
      return NextResponse.json({ error: "bot not found" }, { status: 404 });
    }
    const result = await applyBotPolish({ botId: rows[0].id });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
