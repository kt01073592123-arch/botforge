// Buyurtmalar lifecycle: list + status update.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot, getBotToken } from "@/lib/bots";
import { db } from "@/lib/supabase/server";
import { TgBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

const STATUS_LABELS_UZ: Record<OrderStatus, string> = {
  pending: "Yangi buyurtma",
  confirmed: "Tasdiqlandi",
  in_progress: "Bajarilmoqda",
  completed: "Bajarildi",
  cancelled: "Bekor qilindi",
};

const STATUS_EMOJI: Record<OrderStatus, string> = {
  pending: "🆕",
  confirmed: "✅",
  in_progress: "🔄",
  completed: "✓",
  cancelled: "❌",
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.getAll("status");
    let q = db()
      .from("orders")
      .select("*")
      .eq("bot_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (status.length) q = q.in("status", status as never[]);

    const { data } = await q;
    return NextResponse.json({ orders: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

const PatchBody = z.object({
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) return NextResponse.json({ error: "orderId kerak" }, { status: 400 });

    const body = PatchBody.parse(await req.json());

    const sb = db();
    const update: Record<string, unknown> = { status: body.status };
    if (body.status === "completed") update.completed_at = new Date().toISOString();
    await sb.from("orders").update(update).eq("id", orderId).eq("bot_id", id);

    // Customer Telegram’ga xabar
    const { data: order } = await sb
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (order?.customer_tg_id) {
      try {
        const tg = new TgBot(await getBotToken(id));
        await tg.sendMessage(
          order.customer_tg_id,
          `${STATUS_EMOJI[body.status]} <b>Buyurtmangiz holati: ${STATUS_LABELS_UZ[body.status]}</b>\n\n` +
            `Buyurtma raqami: <code>${order.id.slice(0, 8)}</code>\n` +
            `Jami: ${(order.total_uzs as number).toLocaleString("uz-UZ")} so‘m`
        );
      } catch { /* ignore */ }
    }

    // Customer profile’ni yangilash (jami buyurtma + xarajat)
    if (order?.customer_tg_id && body.status === "completed") {
      await sb
        .from("customer_profiles")
        .update({
          total_orders: (order.total_orders ?? 0) + 1,
          total_spent_uzs:
            (Number(order.total_uzs ?? 0)) + (Number(order.total_spent_uzs ?? 0)),
        })
        .eq("bot_id", id)
        .eq("tg_user_id", order.customer_tg_id);
      // Loyalty point qo‘shamiz (1 punch = 1 buyurtma)
      const sql = (await import("@/lib/db")).sql();
      await sql`update customer_profiles
                set total_orders = total_orders + 1,
                    total_spent_uzs = total_spent_uzs + ${order.total_uzs ?? 0},
                    loyalty_points = loyalty_points + 1
                where bot_id = ${id} and tg_user_id = ${order.customer_tg_id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
