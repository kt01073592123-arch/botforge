import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { setBotToken } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string().regex(/^\d+:[A-Za-z0-9_-]{20,}$/, "Telegram bot token formati noto‘g‘ri"),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const body = Body.parse(await req.json());
    const me = await setBotToken({ ownerId: s.uid, botId: id, token: body.token });
    return NextResponse.json({ ok: true, bot: me });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
