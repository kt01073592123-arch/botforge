// Payme webhook (JSON-RPC).
// 6 ta method: CheckPerformTransaction, CreateTransaction, PerformTransaction,
// CancelTransaction, CheckTransaction, GetStatement.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { upgradeSubscription } from "@/lib/billing";
import { paymeError, paymeOk, verifyPaymeAuth, PAYME_ERR } from "@/lib/payme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  user_id: string;
  plan_id: string;
  amount_uzs: number;
  status: string;
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
};

export async function POST(req: Request) {
  if (!verifyPaymeAuth(req.headers.get("authorization"))) {
    return NextResponse.json(paymeError(0, PAYME_ERR.INVALID_AUTH, "Auth failed"));
  }

  type Body = { id: number | string; method: string; params: Record<string, unknown> };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(paymeError(0, PAYME_ERR.INVALID_PARAMS, "Invalid JSON"));
  }

  const { id, method, params } = body;
  const sb = db();

  // CheckPerformTransaction — tekshirish (yangi to'lov mumkinmi)
  if (method === "CheckPerformTransaction") {
    const account = (params.account as { merchant_trans_id?: string }) ?? {};
    const amount = Number(params.amount) / 100; // Payme tiyin'da
    if (!account.merchant_trans_id) {
      return NextResponse.json(paymeError(id, PAYME_ERR.INVALID_PARAMS, "merchant_trans_id kerak"));
    }
    const { data } = await sb
      .from("payments")
      .select("*")
      .eq("merchant_trans_id", account.merchant_trans_id)
      .maybeSingle();
    const pay = data as PaymentRow | null;
    if (!pay) {
      return NextResponse.json(paymeError(id, PAYME_ERR.TRANSACTION_NOT_FOUND, "To'lov topilmadi"));
    }
    if (Math.round(amount) !== pay.amount_uzs) {
      return NextResponse.json(paymeError(id, PAYME_ERR.AMOUNT, "Summa noto'g'ri"));
    }
    return NextResponse.json(paymeOk(id, { allow: true }));
  }

  // CreateTransaction — to'lov yaratish
  if (method === "CreateTransaction") {
    const txnId = String(params.id);
    const time = Number(params.time);
    const amount = Number(params.amount) / 100;
    const account = (params.account as { merchant_trans_id?: string }) ?? {};
    const { data } = await sb
      .from("payments")
      .select("*")
      .eq("merchant_trans_id", account.merchant_trans_id ?? "")
      .maybeSingle();
    const pay = data as PaymentRow | null;
    if (!pay) {
      return NextResponse.json(paymeError(id, PAYME_ERR.TRANSACTION_NOT_FOUND, "To'lov topilmadi"));
    }
    if (Math.round(amount) !== pay.amount_uzs) {
      return NextResponse.json(paymeError(id, PAYME_ERR.AMOUNT, "Summa noto'g'ri"));
    }
    const meta = (pay.metadata ?? {}) as { payme_id?: string; create_time?: number };
    if (meta.payme_id && meta.payme_id !== txnId) {
      return NextResponse.json(paymeError(id, PAYME_ERR.CANNOT_PERFORM, "Boshqa tranzaksiya bor"));
    }
    if (!meta.payme_id) {
      await sb
        .from("payments")
        .update({
          provider_txn_id: txnId,
          status: "authorized",
          metadata: { ...(pay.metadata ?? {}), payme_id: txnId, create_time: time, state: 1 },
        })
        .eq("id", pay.id);
    }
    return NextResponse.json(
      paymeOk(id, {
        create_time: time,
        transaction: pay.id,
        state: 1,
      }),
    );
  }

  // PerformTransaction — to'lovni yakunlash (pul yechilgan)
  if (method === "PerformTransaction") {
    const txnId = String(params.id);
    const { data } = await sb
      .from("payments")
      .select("*")
      .eq("provider_txn_id", txnId)
      .maybeSingle();
    const pay = data as PaymentRow | null;
    if (!pay) {
      return NextResponse.json(paymeError(id, PAYME_ERR.TRANSACTION_NOT_FOUND, "To'lov topilmadi"));
    }
    if (pay.status === "paid") {
      const meta = (pay.metadata ?? {}) as { perform_time?: number };
      return NextResponse.json(
        paymeOk(id, {
          transaction: pay.id,
          perform_time: meta.perform_time ?? Date.now(),
          state: 2,
        }),
      );
    }
    const performTime = Date.now();
    await sb
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date(performTime).toISOString(),
        metadata: { ...(pay.metadata ?? {}), perform_time: performTime, state: 2 },
      })
      .eq("id", pay.id);
    await upgradeSubscription({ userId: pay.user_id, planId: pay.plan_id });
    return NextResponse.json(
      paymeOk(id, { transaction: pay.id, perform_time: performTime, state: 2 }),
    );
  }

  // CancelTransaction
  if (method === "CancelTransaction") {
    const txnId = String(params.id);
    const reason = Number(params.reason);
    const { data } = await sb
      .from("payments")
      .select("*")
      .eq("provider_txn_id", txnId)
      .maybeSingle();
    const pay = data as PaymentRow | null;
    if (!pay) {
      return NextResponse.json(paymeError(id, PAYME_ERR.TRANSACTION_NOT_FOUND, "To'lov topilmadi"));
    }
    const cancelTime = Date.now();
    const newState = pay.status === "paid" ? -2 : -1;
    await sb
      .from("payments")
      .update({
        status: "cancelled",
        metadata: {
          ...(pay.metadata ?? {}),
          cancel_time: cancelTime,
          reason,
          state: newState,
        },
      })
      .eq("id", pay.id);
    return NextResponse.json(
      paymeOk(id, { transaction: pay.id, cancel_time: cancelTime, state: newState }),
    );
  }

  // CheckTransaction
  if (method === "CheckTransaction") {
    const txnId = String(params.id);
    const { data } = await sb
      .from("payments")
      .select("*")
      .eq("provider_txn_id", txnId)
      .maybeSingle();
    const pay = data as PaymentRow | null;
    if (!pay) {
      return NextResponse.json(paymeError(id, PAYME_ERR.TRANSACTION_NOT_FOUND, "To'lov topilmadi"));
    }
    const meta = (pay.metadata ?? {}) as {
      create_time?: number;
      perform_time?: number;
      cancel_time?: number;
      state?: number;
      reason?: number;
    };
    return NextResponse.json(
      paymeOk(id, {
        create_time: meta.create_time ?? 0,
        perform_time: meta.perform_time ?? 0,
        cancel_time: meta.cancel_time ?? 0,
        transaction: pay.id,
        state: meta.state ?? 0,
        reason: meta.reason ?? null,
      }),
    );
  }

  return NextResponse.json(paymeError(id, PAYME_ERR.INVALID_PARAMS, `Unknown method: ${method}`));
}
