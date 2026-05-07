// Managed bot creation flow’ni boshlaydi.
// WebApp ichidagi "Avtomatik bot yaratish" tugmasi shu endpoint’ni chaqiradi.
// Token hech qachon response ichida qaytmaydi.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { startManagedBotCreation } from "@/lib/managed_bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (bot.tg_bot_id) {
      return NextResponse.json(
        { error: "Bu botga allaqachon token ulangan" },
        { status: 400 }
      );
    }

    const result = await startManagedBotCreation({
      ownerId: s.uid,
      ownerTelegramId: s.tg,
      bot,
    });

    return NextResponse.json({
      ok: true,
      // Token va sezgir ma’lumot qaytarilmaydi
      sent_to_chat_id: result.sent_to_chat_id,
      suggested_name: result.suggested_name,
      suggested_username: result.suggested_username,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
