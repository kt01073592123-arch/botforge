// Operator dashboard ichidan mijozga javob beradi.
// Bot tokeni orqali Telegram'ga yuboradi va messages jadvaliga "operator" sifatida saqlaydi.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot, getBotToken } from "@/lib/bots";
import { db } from "@/lib/supabase/server";
import { TgBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().min(1).max(4000),
  resume_ai: z.boolean().optional(), // javobdan keyin AI ga qaytaradimi
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; convId: string }> }
) {
  try {
    const s = await requireSession();
    const { id, convId } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const sb = db();
    const { data: conv } = await sb
      .from("conversations")
      .select("*")
      .eq("id", convId)
      .eq("bot_id", id)
      .maybeSingle();
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

    const body = Body.parse(await req.json());

    const token = await getBotToken(id);
    await new TgBot(token).sendMessage(conv.tg_chat_id, body.text);

    await sb.from("messages").insert({
      conversation_id: convId,
      bot_id: id,
      role: "assistant",
      content: body.text,
      metadata: { from: "operator", operator_id: s.uid },
    });

    if (body.resume_ai) {
      await sb.from("conversations").update({ status: "open" }).eq("id", convId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
