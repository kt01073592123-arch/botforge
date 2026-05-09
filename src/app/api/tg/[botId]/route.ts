// Universal Telegram webhook router. URL: /api/tg/<botId>
// - secret_token header validation (per-bot unikal)
// - update_id deduplication (Telegram retry mexanizmidan himoya)
// - PII redaction webhook_logs uchun
// - tez 200 OK javob: og'ir ishlar try/catch ichida

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { handleUpdate } from "@/lib/runtime";
import { alertOwner } from "@/lib/alerts";
import { redactPayload } from "@/lib/redact";
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

  // ─── DEDUP ─────────────────────────────────────────────
  // Telegram bir xil update'ni qayta yuborishi mumkin (network timeout, retry).
  // Atomic insert via RPC: agar bor bo'lsa false qaytadi → silently skip.
  if (update.update_id) {
    try {
      const { data: isNew } = await sb.rpc("try_mark_update_processed", {
        p_bot_id: bot.id,
        p_update_id: update.update_id,
      });
      if (isNew === false) {
        // Duplicate — Telegram'ga 200 qaytaramiz, bekor takror yubormasligi uchun
        return NextResponse.json({ ok: true, dedup: true });
      }
    } catch (e) {
      // Dedup DB tushsa ham ish davom etadi (fail-open, ammo kamdan-kam dup bo'ladi)
      console.error("[dedup] failed:", (e as Error).message);
    }
  }

  // ─── HANDLE ────────────────────────────────────────────
  try {
    await handleUpdate(bot, update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const errMsg = (e as Error).message;
    // PII'ni log'ga yozishdan oldin maskalaymiz
    await sb.from("webhook_logs").insert({
      bot_id: bot.id,
      status: 500,
      error: errMsg,
      payload: redactPayload(update as unknown as Record<string, unknown>),
    });
    await alertOwner({ botId: bot.id, kind: "webhook_error", details: errMsg });
    // Foydalanuvchini block'da qoldirmaslik uchun 200 qaytaramiz
    return NextResponse.json({ ok: false, error: "handler_error" });
  }
}

// Health check
export async function GET(_req: Request, ctx: { params: Promise<{ botId: string }> }) {
  const { botId } = await ctx.params;
  return NextResponse.json({ ok: true, botId });
}
