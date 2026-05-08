// Loyalty config

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const { data } = await db()
      .from("loyalty_configs")
      .select("*")
      .eq("bot_id", id)
      .maybeSingle();
    return NextResponse.json({
      config: data ?? {
        bot_id: id,
        enabled: false,
        punch_threshold: 5,
        punch_reward: "1 ta xizmat 50% chegirma",
        referral_enabled: false,
        referral_bonus_uzs: 50000,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

const Body = z.object({
  enabled: z.boolean(),
  punch_threshold: z.number().int().min(1).max(100),
  punch_reward: z.string().max(500),
  referral_enabled: z.boolean(),
  referral_bonus_uzs: z.number().int().min(0).max(10_000_000),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const body = Body.parse(await req.json());
    await db()
      .from("loyalty_configs")
      .upsert({ bot_id: id, ...body }, { onConflict: "bot_id" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
