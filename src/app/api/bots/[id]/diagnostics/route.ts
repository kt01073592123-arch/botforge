// Bot Doctor — diagnostics list + manual trigger.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { diagnoseBot } from "@/lib/bot_doctor";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const { data } = await db()
    .from("bot_diagnostics")
    .select("*")
    .eq("bot_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ diagnostics: data ?? [] });
}

// Manual run — bot egasi "hozir tahlil qil" tugmasini bosganda
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const r = await diagnoseBot(id, 7);
  if (!r) {
    return NextResponse.json(
      { error: "not_enough_data", message: "Yetarli ma'lumot yo'q (kamida 20 ta xabar kerak)" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, ...r });
}
