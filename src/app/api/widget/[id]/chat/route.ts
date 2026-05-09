// Web widget chat endpoint — sayt'ga embed qilingan AI chat.
// CORS: hammaga ochiq (POST), lekin rate limit qattiq.
// Auth yo'q — public bot bilan suhbat. Rate limit IP'ga.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { generateReply } from "@/lib/ai/engine";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { BotRow, ConversationRow, MessageRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  session_id: z.string().min(8).max(80),
  message: z.string().min(1).max(2000),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    })
  ).max(20).optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "3600",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const ip = clientIp(req);
  const ok = await rateLimit({
    scope: "api_ip",
    key: `widget|${id}|${ip}`,
    windowSeconds: 60,
    limit: 20,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: corsHeaders }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_input", issues: parsed.error.issues },
      { status: 400, headers: corsHeaders }
    );
  }

  const sb = db();
  const { data: botRow } = await sb
    .from("bots")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  const bot = botRow as BotRow | null;
  if (!bot) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
  }
  if (bot.status !== "active") {
    return NextResponse.json(
      { error: "bot_inactive" },
      { status: 403, headers: corsHeaders }
    );
  }
  if (bot.monthly_messages_used >= bot.monthly_message_limit) {
    return NextResponse.json(
      { error: "limit_reached" },
      { status: 429, headers: corsHeaders }
    );
  }

  // Web widget conversations — Telegram bilan aralashmaslik uchun chat_id "negative"
  // pseudo-id ishlatamiz (hash session_id'dan)
  const sessionHash = simpleHash(parsed.data.session_id);
  const fakeChatId = -1_000_000_000_000 - sessionHash;

  // Conv yaratish/topish
  let convRow = (await sb
    .from("conversations")
    .select("*")
    .eq("bot_id", bot.id)
    .eq("tg_chat_id", fakeChatId)
    .maybeSingle()
  ).data as ConversationRow | null;

  if (!convRow) {
    const ins = await sb
      .from("conversations")
      .insert({
        bot_id: bot.id,
        tg_chat_id: fakeChatId,
        tg_user_id: fakeChatId,
        customer_name: "Web visitor",
      })
      .select("*")
      .single();
    convRow = ins.data as ConversationRow;
  }

  // User xabarni saqlaymiz
  await sb.from("messages").insert({
    conversation_id: convRow.id,
    bot_id: bot.id,
    role: "user",
    content: parsed.data.message,
  });

  // Tarix
  const { data: history } = await sb
    .from("messages")
    .select("role, content")
    .eq("conversation_id", convRow.id)
    .order("created_at", { ascending: true })
    .limit(20);

  let result;
  try {
    result = await generateReply({
      bot,
      conv: convRow,
      history: (history ?? []) as Pick<MessageRow, "role" | "content">[],
    });
  } catch (e) {
    return NextResponse.json(
      { error: "engine_error", message: (e as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }

  // Bot javobi (faqat send action)
  const replies = result.actions
    .filter((a) => a.type === "send")
    .map((a) => (a as { type: "send"; text: string }).text);

  // Saqlaymiz
  for (const txt of replies) {
    await sb.from("messages").insert({
      conversation_id: convRow.id,
      bot_id: bot.id,
      role: "assistant",
      content: txt,
    });
  }

  // Counter
  await sb.rpc("increment_bot_messages", { p_bot_id: bot.id }).catch(() => {});

  return NextResponse.json(
    { messages: replies, ok: true },
    { headers: corsHeaders }
  );
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i), (h |= 0);
  return Math.abs(h);
}
