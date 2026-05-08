// Customer WebApp uchun Click to‘lov tayyorlash.
// Hozirda har bot uchun mijoz to‘lovi BotForge platforma Click hisobiga keladi —
// kelajakda har biznes egasiga o‘z merchant ID qo‘shish yo‘l xaritasida.
// Hozir: "demo" rejimi — payments jadvaliga yozadi va Click URL qaytaradi.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/supabase/server";
import { buildClickPaymentUrl } from "@/lib/click";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  order_id: z.string().uuid(),
});

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `checkout|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 10,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id, owner_id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const { data: order } = await sb
    .from("orders")
    .select("*")
    .eq("id", body.order_id)
    .eq("bot_id", bot.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Order topilmadi" }, { status: 404 });
  if (order.paid) {
    return NextResponse.json({ error: "Allaqachon to‘langan" }, { status: 400 });
  }

  const serviceId = Number(process.env.CLICK_SERVICE_ID);
  const merchantId = Number(process.env.CLICK_MERCHANT_ID);
  if (!serviceId || !merchantId) {
    return NextResponse.json(
      { error: "To‘lov hozircha sozlanmagan. Naqd to‘lash mumkin." },
      { status: 503 }
    );
  }

  const merchantTransId = `bf_order_${order.id}_${randomBytes(2).toString("hex")}`;

  const { data: pay } = await sb
    .from("payments")
    .insert({
      user_id: bot.owner_id,
      plan_id: "free", // order to‘lovi — tarif bilan bog‘liq emas, lekin schema talab qiladi
      provider: "click",
      merchant_trans_id: merchantTransId,
      amount_uzs: order.total_uzs,
      status: "pending",
      metadata: { order_id: order.id, type: "customer_order" },
    })
    .select("id")
    .single();

  if (pay) {
    await sb.from("orders").update({ payment_id: pay.id }).eq("id", order.id);
  }

  const url = buildClickPaymentUrl({
    serviceId,
    merchantId,
    amount: order.total_uzs,
    transactionParam: merchantTransId,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/c/${username}`,
  });

  return NextResponse.json({ url, payment_id: pay?.id ?? null });
}
