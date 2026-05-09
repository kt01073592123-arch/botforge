// Sharhlar - Mini App'da public review'larni ko'rsatish va yangi review yuborish.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTgUser(initData: string): { id?: number; first_name?: string; username?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const u = params.get("user");
    if (!u) return null;
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `reviews_get|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 30,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  const { data: reviews } = await sb
    .from("reviews")
    .select("id, rating, text, customer_name, created_at")
    .eq("bot_id", (bot as { id: string }).id)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  // Average rating
  const arr = (reviews ?? []) as { rating: number }[];
  const avg =
    arr.length > 0 ? arr.reduce((s, r) => s + r.rating, 0) / arr.length : 0;

  return NextResponse.json({
    reviews: reviews ?? [],
    avg_rating: Math.round(avg * 10) / 10,
    count: arr.length,
  });
}

const PostBody = z.object({
  init_data: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
  order_id: z.string().uuid().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `reviews_post|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 5,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  let body;
  try {
    body = PostBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  const tgUser = body.init_data ? parseTgUser(body.init_data) : null;

  await sb.from("reviews").insert({
    bot_id: (bot as { id: string }).id,
    customer_tg_id: tgUser?.id ?? null,
    customer_name: tgUser?.first_name ?? null,
    rating: body.rating,
    text: body.text ?? null,
    order_id: body.order_id ?? null,
    is_published: true,
  });

  return NextResponse.json({ ok: true });
}
