// Sandbox endpoint — bot egasi o'z prompt + tools'ini jonli sinash uchun.
// Real Telegram bot tokensiz: history client tomonida saqlanadi, bizga keladi.
// Hech qanday DB yozish yo'q (ai_usage tashqari) — sof simulyatsiya.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { generateReply, estimateCostUsd } from "@/lib/ai/engine";
import { db } from "@/lib/supabase/server";
import type { ConversationRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    })
  ).max(40),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_input", issues: parsed.error.issues }, { status: 400 });
  }

  // Sandbox conversation — sun'iy, DB ga yozilmaydi
  const sandboxConv: ConversationRow = {
    id: "00000000-0000-0000-0000-000000000000",
    bot_id: bot.id,
    tg_chat_id: 0,
    tg_user_id: 0,
    customer_name: "Sandbox tester",
    customer_username: null,
    customer_phone: null,
    status: "open",
    message_count: 0,
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const result = await generateReply({
      bot,
      conv: sandboxConv,
      history: parsed.data.history,
    });

    const cost = estimateCostUsd(bot.ai_model, result.usage.prompt, result.usage.completion);
    // Sandbox usage'ni alohida belgilab DB'ga yozamiz (sandbox=true bilan)
    try {
      await db().from("ai_usage").insert({
        bot_id: bot.id,
        conversation_id: null,
        model: bot.ai_model,
        prompt_tokens: result.usage.prompt,
        completion_tokens: result.usage.completion,
        cost_usd: cost,
        meta: { sandbox: true },
      });
    } catch { /* sandbox usage write fail OK */ }

    // Tool effects'ni front'ga "preview" qilib qaytaramiz
    const messages = result.actions
      .filter((a) => a.type === "send")
      .map((a) => (a as { type: "send"; text: string }).text);
    const effects = result.actions
      .filter((a) => a.type === "effect")
      .map((a) => (a as { type: "effect"; effect: unknown }).effect);

    return NextResponse.json({
      messages,
      effects,
      usage: result.usage,
      cost_usd: cost,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "engine_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
