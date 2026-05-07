// Suhbat holatini o‘zgartirish: open / waiting_human / closed.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(["open", "waiting_human", "closed"]) });

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; convId: string }> }
) {
  try {
    const s = await requireSession();
    const { id, convId } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const body = Body.parse(await req.json());
    await db()
      .from("conversations")
      .update({ status: body.status })
      .eq("id", convId)
      .eq("bot_id", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
