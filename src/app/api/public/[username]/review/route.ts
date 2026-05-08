// Customer WebApp’dan sharh qabul qilish.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  init_data: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
  booking_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
});

function parseTgUser(initData: string): { id?: number; first_name?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const u = params.get("user");
    if (!u) return null;
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `review|${clientIp(req)}`,
    windowSeconds: 3600,
    limit: 10,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const tgUser = body.init_data ? parseTgUser(body.init_data) : null;

  await sb.from("reviews").insert({
    bot_id: bot.id,
    customer_tg_id: tgUser?.id ?? null,
    customer_name: tgUser?.first_name ?? null,
    rating: body.rating,
    text: body.text ?? null,
    booking_id: body.booking_id ?? null,
    order_id: body.order_id ?? null,
  });

  return NextResponse.json({ ok: true });
}
