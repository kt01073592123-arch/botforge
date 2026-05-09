// Mijozning o'z buyurtmalari ro'yxati - Mini App "Buyurtmalarim" bo'limi uchun.

import { NextResponse } from "next/server";
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

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `orders_get|${clientIp(req)}`,
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
    return NextResponse.json({ orders: [] });
  }

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  const { data: orders } = await sb
    .from("orders")
    .select("id, items, total_uzs, status, note, created_at, completed_at")
    .eq("bot_id", (bot as { id: string }).id)
    .eq("customer_tg_id", tgUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ orders: orders ?? [] });
}
