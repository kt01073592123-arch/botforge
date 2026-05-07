// Bot’ning template’idagi sample_broadcasts ro‘yxatini qaytaradi.
// Foydalanuvchi shu yerdan tayyor xabarni nusxalab, tahrirlab yuborishi mumkin.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { getPack } from "@/lib/template_packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (!bot.template_id) return NextResponse.json({ samples: [] });
    const pack = await getPack(bot.template_id);
    return NextResponse.json({ samples: pack?.sample_broadcasts ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
