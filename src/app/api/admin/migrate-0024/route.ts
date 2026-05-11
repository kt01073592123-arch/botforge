// BIR MARTALIK: 0024 (bot_data.custom_buttons) migrationni qo'llaydi.
// Ishlatilgandan keyin bu faylni o'chirish mumkin.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECRET = "3bb120d735854eb18c27b044a4bcd442";

const M0024 = `
alter table public.bot_data
  add column if not exists custom_buttons jsonb default null;

comment on column public.bot_data.custom_buttons is
  'AI generatsiya yoki bot egasi tomonidan o''zgartirilgan tugmalar. NULL bo''lsa bot_templates.default_buttons ishlatiladi. Format: [{"text":"...","web_app":bool?,"url":"..."?}]';
`;

export async function POST(req: Request) {
  if (req.headers.get("x-migrate-secret") !== SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results: Record<string, string> = {};
  const s = sql();

  try {
    await s.unsafe(M0024);
    results["0024_custom_buttons"] = "ok";
  } catch (e) {
    results["0024_custom_buttons"] = `error: ${(e as Error).message}`;
  }

  return NextResponse.json({ results });
}
