import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { pauseBot } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    await pauseBot({ ownerId: s.uid, botId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
