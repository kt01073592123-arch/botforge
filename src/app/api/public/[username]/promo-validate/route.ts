// Mini App: mijoz promo kod kiritsa, server tekshirib chegirma qaytaradi.
// POST: { code: string, total_uzs: number, init_data?: string, tg_id?: number }

import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  code: z.string().min(1).max(40),
  total_uzs: z.number().int().nonnegative(),
  init_data: z.string().optional(),
  tg_id: z.number().int().optional(),
});

function parseTgUserId(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const u = params.get("user");
    if (!u) return null;
    const parsed = JSON.parse(u) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `promo_validate|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 30,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  try {
    const { username } = await ctx.params;
    const body = Body.parse(await req.json());

    const s = sql();
    const bots = (await s`
      select id from public.bots
       where tg_username = ${username} and deleted_at is null
       limit 1
    `) as Array<{ id: string }>;
    if (bots.length === 0) {
      return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });
    }
    const botId = bots[0].id;

    const tgId =
      body.tg_id ??
      (body.init_data ? parseTgUserId(body.init_data) : null) ??
      null;

    const result = (await s`
      select public.validate_promo_code(
        ${botId}::uuid,
        ${body.code},
        ${body.total_uzs}::int,
        ${tgId}::bigint
      ) as r
    `) as Array<{ r: { valid: boolean; discount_uzs?: number; error?: string; code_id?: string } }>;

    return NextResponse.json(result[0]?.r ?? { valid: false, error: "Tekshirib bo'lmadi" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
