// Platforma boti uchun webhook (faqat manager bot — @botforge_1bot).
// Foydalanuvchi botlari uchun emas — ular /api/tg/[botId] orqali ishlaydi.
// Bu endpoint asosan managed_bot va managed_bot_created event’larini qabul qiladi.

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { completeManagedBotCreation } from "@/lib/managed_bots";
import type { TgUpdate } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  // Telegram secret_token tekshiruvi
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (headerSecret !== env().WEBHOOK_SECRET) {
    return new NextResponse("forbidden", { status: 403 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  try {
    // 1. ManagedBotUpdated — bot yaratilganda yoki tokeni o‘zgarganda
    if (update.managed_bot) {
      const r = await completeManagedBotCreation({
        creatorTelegramId: update.managed_bot.user.id,
        newBot: update.managed_bot.bot,
      });
      // Telegram’ga 200 qaytaramiz, har qanday holatda (idempotent)
      return NextResponse.json({ ok: true, handled: "managed_bot", result: r });
    }

    // 2. Service xabar: managed_bot_created
    if (update.message?.managed_bot_created && update.message.from) {
      const r = await completeManagedBotCreation({
        creatorTelegramId: update.message.from.id,
        newBot: update.message.managed_bot_created.bot,
      });
      return NextResponse.json({
        ok: true,
        handled: "message.managed_bot_created",
        result: r,
      });
    }

    // 3. /start kelsa — qisqa salom yuborish (ixtiyoriy)
    // Hozir hech narsa qilmaymiz, WebApp menyusi ko‘rinib turadi.
    return NextResponse.json({ ok: true, handled: "ignored" });
  } catch (e) {
    // Token va sezgir narsani logga yozmaymiz
    console.error("[tg-platform]", (e as Error).name, (e as Error).message);
    // Telegram qayta yubormasligi uchun 200 qaytaramiz
    return NextResponse.json({ ok: false, error: "handler_error" });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "tg-platform" });
}
