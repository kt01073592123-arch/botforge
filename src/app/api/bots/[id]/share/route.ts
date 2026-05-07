// Bot’ni ulashish uchun: deep link, public landing URL, QR kod.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildShareInfo } from "@/lib/bot_polish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const info = await buildShareInfo({ ownerId: s.uid, botId: id });
    if (!info) {
      return NextResponse.json(
        { error: "Bot ulanmagan yoki ruxsat yo‘q" },
        { status: 404 }
      );
    }
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
