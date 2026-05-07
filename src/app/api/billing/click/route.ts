// Click webhook (prepare + complete). Click hujjatiga qat'iy mos.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { clickSign } from "@/lib/click";
import { upgradeSubscription } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERR_OK = 0;
const ERR_SIGN = -1;
const ERR_AMOUNT = -2;
const ERR_NOT_FOUND = -5;
const ERR_ALREADY = -4;

export async function POST(req: Request) {
  const form = await req.formData();
  const body = Object.fromEntries(form) as Record<string, string>;

  const secret = process.env.CLICK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: ERR_SIGN, error_note: "secret missing" });
  }

  const action = Number(body.action);
  const expectedSign = clickSign({
    secret,
    click_trans_id: Number(body.click_trans_id),
    service_id: Number(body.service_id),
    merchant_trans_id: body.merchant_trans_id,
    merchant_prepare_id: body.merchant_prepare_id
      ? Number(body.merchant_prepare_id)
      : undefined,
    amount: Number(body.amount),
    action: action as 0 | 1,
    sign_time: body.sign_time,
  });
  if (expectedSign !== body.sign_string) {
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error: ERR_SIGN,
      error_note: "Sign error",
    });
  }

  const sb = db();
  const { data: pay } = await sb
    .from("payments")
    .select("*")
    .eq("merchant_trans_id", body.merchant_trans_id)
    .maybeSingle();

  if (!pay) {
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error: ERR_NOT_FOUND,
      error_note: "Payment not found",
    });
  }

  if (Math.round(Number(body.amount)) !== pay.amount_uzs) {
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error: ERR_AMOUNT,
      error_note: "Amount mismatch",
    });
  }

  if (action === 0) {
    // PREPARE
    if (pay.status !== "pending") {
      return NextResponse.json({
        click_trans_id: body.click_trans_id,
        merchant_trans_id: body.merchant_trans_id,
        merchant_prepare_id: pay.id,
        error: ERR_ALREADY,
        error_note: "Already processed",
      });
    }
    await sb
      .from("payments")
      .update({ status: "authorized", provider_txn_id: String(body.click_trans_id) })
      .eq("id", pay.id);
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: pay.id,
      error: ERR_OK,
      error_note: "Success",
    });
  }

  if (action === 1) {
    // COMPLETE
    if (pay.status === "paid") {
      return NextResponse.json({
        click_trans_id: body.click_trans_id,
        merchant_trans_id: body.merchant_trans_id,
        merchant_confirm_id: pay.id,
        error: ERR_ALREADY,
        error_note: "Already paid",
      });
    }
    await sb
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", pay.id);
    await upgradeSubscription({ userId: pay.user_id, planId: pay.plan_id });
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: pay.id,
      error: ERR_OK,
      error_note: "Success",
    });
  }

  return NextResponse.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    error: -3,
    error_note: "Unknown action",
  });
}
