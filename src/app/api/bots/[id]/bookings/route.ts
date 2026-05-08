// Admin: bronlar ro‘yxati va status boshqaruv

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import {
  listBookings,
  bookingCalendarSummary,
  type BookingStatus,
} from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const view = url.searchParams.get("view") ?? "list"; // list | calendar
    if (view === "calendar") {
      const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
      const days = Math.min(60, Math.max(7, Number(url.searchParams.get("days")) || 14));
      const summary = await bookingCalendarSummary({ botId: id, from, days });
      return NextResponse.json({ summary });
    }

    const status = url.searchParams.getAll("status") as BookingStatus[];
    const fromDate = url.searchParams.get("from") ?? undefined;
    const items = await listBookings({
      botId: id,
      status: status.length ? status : undefined,
      fromDate,
    });
    return NextResponse.json({ bookings: items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

const PatchBody = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // PATCH /api/bots/[id]/bookings?bookingId=...
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId");
    if (!bookingId) return NextResponse.json({ error: "bookingId kerak" }, { status: 400 });

    const body = PatchBody.parse(await req.json());
    const { db } = await import("@/lib/supabase/server");
    await db()
      .from("bookings")
      .update({ status: body.status })
      .eq("id", bookingId)
      .eq("bot_id", id);

    // Mijozga xabar (faqat confirm/cancel uchun)
    if (body.status === "confirmed" || body.status === "cancelled") {
      const { data: bk } = await db()
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();
      if (bk?.customer_tg_id) {
        try {
          const { getBotToken } = await import("@/lib/bots");
          const { TgBot } = await import("@/lib/telegram");
          const tg = new TgBot(await getBotToken(id));
          const slotDate = new Date(bk.slot_start);
          const dateStr = slotDate.toLocaleString("uz-UZ", {
            timeZone: "Asia/Tashkent",
            weekday: "long",
            day: "2-digit",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });
          const text =
            body.status === "confirmed"
              ? `✅ Sizning broningiz tasdiqlandi:\n\n<b>${bk.service_name}</b>\n📅 ${dateStr}\n\nKutamiz!`
              : `❌ Sizning broningiz bekor qilindi:\n\n<b>${bk.service_name}</b>\n📅 ${dateStr}\n\nIltimos, qayta bron qiling yoki admin bilan bog‘laning.`;
          await tg.sendMessage(bk.customer_tg_id, text);
        } catch { /* xabar yuborib bo‘lmasa ham status o‘zgardi */ }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
