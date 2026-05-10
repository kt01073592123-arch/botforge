// BIR MARTALIK: beauty_41c3_bot ni explore galeriyasiga ochib qo'yadi (test uchun).

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function POST(req: Request) {
  if (req.headers.get("x-migrate-secret") !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const s = sql();
    await s`
      update public.bots
         set is_public = true,
             explore_category = 'shop',
             description = coalesce(description, 'Premium beauty mahsulotlari, Korea brendlari, Toshkent ichida bepul yetkazib berish.')
       where tg_username = 'beauty_41c3_bot'
    `;
    const r = await s`
      select id, business_name, is_public, explore_category, description
        from public.bots where tg_username = 'beauty_41c3_bot'
    `;
    return NextResponse.json({ ok: true, bot: r[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
