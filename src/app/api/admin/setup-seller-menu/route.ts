// BIR MARTALIK: platform bot (@BotForgeBot) ga "🛠 Botlarimni boshqarish"
// menu button sozlaydi — bu Seller Mini App'ni ochadi.

import { NextResponse } from "next/server";
import { TgBot } from "@/lib/telegram";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

export async function POST(req: Request) {
  if (req.headers.get("x-migrate-secret") !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const tg = new TgBot(env().TELEGRAM_BOT_TOKEN);
    const baseUrl = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    await tg.setChatMenuButton({
      text: "🛠 Botlarim",
      url: `${baseUrl}/seller`,
    });
    const result = await tg.call("getChatMenuButton", {});
    return NextResponse.json({ ok: true, menu_button: result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
