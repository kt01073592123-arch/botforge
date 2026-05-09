// BIR MARTALIK: Telegram'dan getChatMenuButton qaytaradi.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getBotToken } from "@/lib/bots";
import { TgBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function GET(req: Request) {
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
      select id, tg_username from public.bots where tg_username = ${username} limit 1
    `) as Array<{ id: string; tg_username: string }>;
    if (rows.length === 0) {
      return NextResponse.json({ error: "bot not found" }, { status: 404 });
    }
    const token = await getBotToken(rows[0].id);
    const tg = new TgBot(token);
    const result = await tg.call("getChatMenuButton", {});
    return NextResponse.json({ bot: rows[0].tg_username, menu_button: result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
