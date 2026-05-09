// Referral / cashback - Mini App'da do'stni taklif qilish.
// GET: foydalanuvchi uchun unique link + jami yig'ilgan cashback bonus.
// POST: yangi referral yozuvini yaratish (mijoz boshqa mijozni taklif qilganda).

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

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `ref_get|${clientIp(req)}`,
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

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id, tg_username")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  const botRow = bot as { id: string; tg_username: string };

  // Mijozning referral kodi - tg_user_id (deep link uchun)
  const refLink = `https://t.me/${botRow.tg_username}?start=ref_${tgUserId}`;

  // Foydalanuvchi taklif qilgan kishilar va keshbek
  const { data: refsRaw } = await sb
    .from("referrals")
    .select("referred_tg_id, bonus_uzs, bonus_granted, created_at")
    .eq("bot_id", botRow.id)
    .eq("referrer_tg_id", tgUserId)
    .order("created_at", { ascending: false });

  const refs = (refsRaw ?? []) as { bonus_uzs: number; bonus_granted: boolean }[];
  const totalBonus = refs.filter((r) => r.bonus_granted).reduce((s, r) => s + (r.bonus_uzs ?? 0), 0);

  // Loyalty profile - cashback wallet
  const { data: profile } = await sb
    .from("customer_profiles")
    .select("loyalty_points")
    .eq("bot_id", botRow.id)
    .eq("tg_user_id", tgUserId)
    .maybeSingle();

  return NextResponse.json({
    referral_link: refLink,
    referrals_count: refs.length,
    referrals_completed: refs.filter((r) => r.bonus_granted).length,
    total_bonus_earned_uzs: totalBonus,
    bonus_balance_uzs: (profile as { loyalty_points?: number } | null)?.loyalty_points ?? 0,
  });
}

const PostBody = z.object({
  init_data: z.string().optional(),
  tg_id: z.number().optional(),
  referrer_tg_id: z.number(),
});

// Mijoz birinchi marta /start ref_<id> bilan kirsa, bot side bu endpointga
// yozadi (yoki to'g'ridan-to'g'ri DB yozuvi).
export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `ref_post|${clientIp(req)}`,
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

  const referredTgId = body.tg_id ?? (body.init_data ? parseTgUserId(body.init_data) : null);
  if (!referredTgId || referredTgId === body.referrer_tg_id) {
    return NextResponse.json({ error: "Yaroqsiz" }, { status: 400 });
  }

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  // Conflict bo'lsa (mijoz ilgari boshqa referrer bilan keldi) - yangilamaymiz
  await sb
    .from("referrals")
    .insert({
      bot_id: (bot as { id: string }).id,
      referrer_tg_id: body.referrer_tg_id,
      referred_tg_id: referredTgId,
    })
    .select()
    .maybeSingle();

  return NextResponse.json({ ok: true });
}
