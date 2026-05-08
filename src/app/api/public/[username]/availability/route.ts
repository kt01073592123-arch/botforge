// Customer WebApp uchun bo‘sh slotlarni qaytaradi.
// GET /api/public/<username>/availability?date=2026-05-09&duration_min=120

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { findAvailableSlots } from "@/lib/bookings";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `avail|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 60,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const durationMin = Math.max(15, Math.min(600, Number(url.searchParams.get("duration_min")) || 60));

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Yaroqsiz date" }, { status: 400 });
  }

  const { data: bot } = await db()
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const slots = await findAvailableSlots({
    botId: bot.id,
    date,
    durationMin,
  });
  return NextResponse.json({ slots });
}
