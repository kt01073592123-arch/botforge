// BIR MARTALIK migration endpoint - 0024 (custom_buttons jsonb).
// Migration qo'llangach FAYL O'CHIRILADI (keyingi commit'da).

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function POST(req: Request) {
  const auth = req.headers.get("x-migrate-secret");
  if (auth !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const s = sql();
    await s`alter table public.bot_data add column if not exists custom_buttons jsonb default null`;
    await s`comment on column public.bot_data.custom_buttons is 'AI generatsiya yoki bot egasi tomonidan o''zgartirilgan tugmalar. NULL bo''lsa bot_templates.default_buttons ishlatiladi. Format: [{"text":"...","web_app":bool?,"url":"..."?}]'`;

    const rows =
      await s`select column_name, data_type from information_schema.columns where table_name = 'bot_data' and column_name = 'custom_buttons'`;

    return NextResponse.json({
      ok: true,
      column: rows[0] ?? null,
      message: "0024 applied",
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
