// Bron oldidan 1 soat avval mijozga eslatma yuboradi.
// Vercel Cron yoki cron-job.org tomonidan har soatda chaqiriladi.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getBotToken } from "@/lib/bots";
import { TgBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const sb = db();

  // 1 soatdan kam vaqtda boshlaydigan, hali eslatma yuborilmagan, faol bronlar
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: bookings } = await sb
    .from("bookings")
    .select("*")
    .in("status", ["pending", "confirmed"] as never[])
    .eq("reminder_sent", false)
    .gte("slot_start", now.toISOString())
    .lte("slot_start", inOneHour.toISOString())
    .limit(50);

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const b of bookings as Array<{
    id: string;
    bot_id: string;
    customer_tg_id: number | null;
    slot_start: string;
    service_name: string;
  }>) {
    if (!b.customer_tg_id) {
      await sb.from("bookings").update({ reminder_sent: true }).eq("id", b.id);
      continue;
    }
    try {
      const token = await getBotToken(b.bot_id);
      const tg = new TgBot(token);
      const slotDate = new Date(b.slot_start);
      const time = slotDate.toLocaleTimeString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        hour: "2-digit",
        minute: "2-digit",
      });
      await tg.sendMessage(
        b.customer_tg_id,
        `⏰ Sizning broningiz 1 soatdan keyin:\n\n<b>${b.service_name}</b>\n📅 ${time}\n\nKutamiz! Kelmaslik holatida iltimos oldindan xabar bering.`
      );
      sent++;
    } catch {
      failed++;
    }
    await sb.from("bookings").update({ reminder_sent: true }).eq("id", b.id);
  }

  return NextResponse.json({ ok: true, sent, failed, total: bookings.length });
}
