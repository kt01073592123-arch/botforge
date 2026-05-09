// BIR MARTALIK diagnostika - NEXT_PUBLIC_APP_URL va bot uchun Mini App URL'ni tekshiradi.
// Foydalanish: GET /api/admin/env-check?bot=<tg_username>&secret=<token>

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const botUsername = url.searchParams.get("bot");

  const result: Record<string, unknown> = {
    NEXT_PUBLIC_APP_URL: appUrl || "(empty)",
    expected: "https://botforge-beige.vercel.app",
    matches_expected: appUrl === "https://botforge-beige.vercel.app",
  };

  if (botUsername) {
    try {
      const s = sql();
      const rows = (await s`
        select b.id, b.name, b.tg_username, b.template_id, b.status,
               (select default_buttons from public.bot_templates where id = b.template_id) as default_buttons,
               (select custom_buttons from public.bot_data where bot_id = b.id) as custom_buttons
          from public.bots b
         where b.tg_username = ${botUsername}
         limit 1
      `) as Array<{
        id: string;
        name: string;
        tg_username: string;
        template_id: string | null;
        status: string;
        default_buttons: unknown;
        custom_buttons: unknown;
      }>;
      if (rows.length === 0) {
        result.bot = "not_found";
      } else {
        const b = rows[0];
        const expectedMiniAppUrl = `${appUrl}/c/${b.tg_username}`;
        result.bot = {
          id: b.id,
          name: b.name,
          tg_username: b.tg_username,
          status: b.status,
          template_id: b.template_id,
          expected_mini_app_url: expectedMiniAppUrl,
          using_custom_buttons: b.custom_buttons !== null,
          custom_buttons: b.custom_buttons,
          template_default_buttons: b.default_buttons,
        };
      }
    } catch (e) {
      result.bot_error = (e as Error).message;
    }
  }

  return NextResponse.json(result);
}
