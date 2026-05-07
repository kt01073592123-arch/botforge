// Bot’ning Telegram’dagi nom, ta'rif va komandalarini avtomatik sozlaydi.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { applyBotPolish } from "@/lib/bot_polish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const r = await applyBotPolish({ ownerId: s.uid, botId: id });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
