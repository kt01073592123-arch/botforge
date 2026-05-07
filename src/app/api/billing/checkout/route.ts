// To‘lovni boshlash — payments jadvaliga pending tranzaksiya yozadi va Click URLni qaytaradi.
// Click env’dan o‘qiladi: CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { listPlans } from "@/lib/billing";
import { buildClickPaymentUrl } from "@/lib/click";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  plan_id: z.enum(["start", "pro", "max"]),
  provider: z.enum(["click"]).default("click"),
});

export async function POST(req: Request) {
  try {
    const s = await requireSession();
    const body = Body.parse(await req.json());

    const plans = await listPlans();
    const plan = plans.find((p) => p.id === body.plan_id);
    if (!plan) return NextResponse.json({ error: "Plan topilmadi" }, { status: 400 });

    const merchantTransId = `bf_${Date.now()}_${randomBytes(4).toString("hex")}`;

    const { error } = await db().from("payments").insert({
      user_id: s.uid,
      plan_id: plan.id,
      provider: "click",
      merchant_trans_id: merchantTransId,
      amount_uzs: plan.price_uzs,
      status: "pending",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const serviceId = Number(process.env.CLICK_SERVICE_ID);
    const merchantId = Number(process.env.CLICK_MERCHANT_ID);
    if (!serviceId || !merchantId) {
      return NextResponse.json(
        {
          error:
            "Click konfiguratsiya qilinmagan. CLICK_SERVICE_ID va CLICK_MERCHANT_ID env’ga qo‘shing.",
        },
        { status: 500 }
      );
    }

    const url = buildClickPaymentUrl({
      serviceId,
      merchantId,
      amount: plan.price_uzs,
      transactionParam: merchantTransId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?status=back`,
    });

    return NextResponse.json({ url, merchant_trans_id: merchantTransId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
