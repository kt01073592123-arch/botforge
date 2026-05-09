// Customer profile - Mini App'dan ism/telefon/manzil saqlash va o'qish.
// Telegram WebApp initData orqali tg_user_id aniqlanadi (best-effort, signature
// verify qilinmaydi - hozircha shunday).

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function findBot(username: string) {
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id, status")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  return bot as { id: string; status: string } | null;
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `profile_get|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 30,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  const url = new URL(req.url);
  const initData = url.searchParams.get("init_data") ?? "";
  const fallbackTgId = url.searchParams.get("tg_id");
  const tgUserId = parseTgUserId(initData) ?? (fallbackTgId ? parseInt(fallbackTgId, 10) : null);

  if (!tgUserId) {
    return NextResponse.json({ error: "tg_user_id topilmadi" }, { status: 400 });
  }

  const bot = await findBot(username);
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  const sb = db();
  const { data: profile } = await sb
    .from("customer_profiles")
    .select("display_name, phone, username, loyalty_points, total_orders, total_spent_uzs")
    .eq("bot_id", bot.id)
    .eq("tg_user_id", tgUserId)
    .maybeSingle();

  return NextResponse.json({
    profile: profile ?? {
      display_name: null,
      phone: null,
      username: null,
      loyalty_points: 0,
      total_orders: 0,
      total_spent_uzs: 0,
    },
  });
}

const PostBody = z.object({
  init_data: z.string().optional(),
  tg_id: z.number().optional(),
  display_name: z.string().min(1).max(100).optional(),
  phone: z.string().min(5).max(30).optional(),
  username: z.string().max(100).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `profile_post|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 10,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  let body;
  try {
    body = PostBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }

  const tgUserId = body.tg_id ?? (body.init_data ? parseTgUserId(body.init_data) : null);
  if (!tgUserId) {
    return NextResponse.json({ error: "tg_user_id topilmadi" }, { status: 400 });
  }

  const bot = await findBot(username);
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  const sb = db();
  await sb.rpc("upsert_customer_profile", {
    p_bot_id: bot.id,
    p_tg_id: tgUserId,
    p_name: body.display_name ?? null,
    p_phone: body.phone ?? null,
    p_username: body.username ?? null,
  });

  return NextResponse.json({ ok: true });
}
