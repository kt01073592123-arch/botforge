// Bitta mijozning to‘liq tarixi.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; customerId: string }> }
) {
  try {
    const s = await requireSession();
    const { id, customerId } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const sb = db();
    const { data: customer } = await sb
      .from("customer_profiles")
      .select("*")
      .eq("id", customerId)
      .eq("bot_id", id)
      .maybeSingle();
    if (!customer) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const tgId = customer.tg_user_id as number;

    const [orders, bookings, leads, conversations] = await Promise.all([
      sb.from("orders")
        .select("*")
        .eq("bot_id", id)
        .eq("customer_tg_id", tgId)
        .order("created_at", { ascending: false }),
      sb.from("bookings")
        .select("*")
        .eq("bot_id", id)
        .eq("customer_tg_id", tgId)
        .order("slot_start", { ascending: false }),
      sb.from("leads")
        .select("*")
        .eq("bot_id", id)
        .eq("phone", customer.phone)
        .order("created_at", { ascending: false }),
      sb.from("conversations")
        .select("*")
        .eq("bot_id", id)
        .eq("tg_user_id", tgId),
    ]);

    return NextResponse.json({
      customer,
      orders: orders.data ?? [],
      bookings: bookings.data ?? [],
      leads: leads.data ?? [],
      conversations: conversations.data ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
