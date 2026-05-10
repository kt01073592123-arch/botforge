// Payme Merchant API integratsiyasi (JSON-RPC).
// Hujjat: https://developer.help.paycom.uz/
//
// Payme webhook'i Basic auth bilan keladi (Paycom:<MERCHANT_KEY>).
// JSON-RPC method'lari: CheckPerformTransaction, CreateTransaction,
// PerformTransaction, CancelTransaction, CheckTransaction, GetStatement.
//
// Env'lar:
//   PAYME_MERCHANT_ID — kassada ko'rinadigan ID
//   PAYME_MERCHANT_KEY — Paycom dashboard'idan secret key
//   NEXT_PUBLIC_APP_URL — return_url uchun

import crypto from "node:crypto";

export const PAYME_ERR = {
  INVALID_AUTH: -32504,
  INSUFFICIENT_PRIVILEGE: -32504,
  AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  CANNOT_PERFORM: -31008,
  ALREADY_DONE: -31060,
  INVALID_PARAMS: -32600,
} as const;

export type PaymeRpcReq = {
  id: number | string;
  method: string;
  params: Record<string, unknown>;
};

export function paymeError(id: number | string, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message: { uz: message, ru: message, en: message } },
  };
}

export function paymeOk(id: number | string, result: Record<string, unknown>) {
  return { jsonrpc: "2.0", id, result };
}

// Webhook autentifikatsiyasi: Basic auth header (Paycom:<MERCHANT_KEY>)
export function verifyPaymeAuth(authHeader: string | null): boolean {
  const key = process.env.PAYME_MERCHANT_KEY;
  if (!key) return false;
  if (!authHeader?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const [user, pass] = decoded.split(":");
    return user === "Paycom" && pass === key;
  } catch {
    return false;
  }
}

// Payme to'lov sahifasi URL'i — foydalanuvchi shu yerga yo'naltiriladi.
// Format: https://checkout.paycom.uz/<base64-encoded-params>
export function buildPaymeCheckoutUrl(opts: {
  merchantId: string;
  amount: number; // tiyin (so'm × 100)
  account: { merchant_trans_id: string };
  returnUrl?: string;
  callbackTimeout?: number; // ms
  lang?: "uz" | "ru" | "en";
}): string {
  const params: string[] = [];
  params.push(`m=${opts.merchantId}`);
  for (const [k, v] of Object.entries(opts.account)) {
    params.push(`ac.${k}=${v}`);
  }
  params.push(`a=${opts.amount}`);
  if (opts.returnUrl) params.push(`c=${opts.returnUrl}`);
  if (opts.callbackTimeout) params.push(`ct=${opts.callbackTimeout}`);
  if (opts.lang) params.push(`l=${opts.lang}`);
  const encoded = Buffer.from(params.join(";")).toString("base64");
  return `https://checkout.paycom.uz/${encoded}`;
}

// Tranzaksiya ID generator (12 belgili hex — Payme talab qiladi)
export function genPaymeTxnId(): string {
  return crypto.randomBytes(12).toString("hex");
}
