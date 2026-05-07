// Universal Telegram webhook router. URL: /api/tg/<botId>
// Telegram secret_token headerini har bir bot uchun unikal saqlaymiz va shu yerda tekshiramiz.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { handleUpdate } from "@/lib/runtime";
import { alertOwner } from "@/lib/alerts";
import type { TgUpdate } from "@/lib/telegram";
import type { BotRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request, ctx: { params: Promise<{ botId: string }> }) {
  const { botId } = await ctx.params;
  const sb = db();

  const { data: botRow } = await sb
    .from("bots")
    .select("*")
    .eq("id", botId)
    .is("deleted_at", null)
    .maybeSingle();
  const bot = botRow as BotRow | null;
  if (!bot) {
    return new NextResponse("not found", { status: 404 });
  }

  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!bot.webhook_secret || headerSecret !== bot.webhook_secret) {
    return new NextResponse("forbidden", { status: 403 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  // Telegram webhookga 200 javobni tez qaytarish kerak; ishni try/catch ichida qilamiz.
  try {
    await handleUpdate(bot, update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const errMsg = (e as Error).message;
    await sb.from("webhook_logs").insert({
      bot_id: bot.id,
      status: 500,
      error: errMsg,
      payload: update as unknown as Record<string, unknown>,
    });
    // Bot egasini xabardor qilamiz
    await alertOwner({ botId: bot.id, kind: "webhook_error", details: errMsg });
    // Foydalanuvchini blockda saqlamaslik uchun 200 qaytaramiz, log yozildi
    return NextResponse.json({ ok: false, error: "handler_error" });
  }
}

// Health check
export async function GET(_req: Request, ctx: { params: Promise<{ botId: string }> }) {
  const { botId } = await ctx.params;
  return NextResponse.json({ ok: true, botId });
}
