// Click.uz Merchant API integratsiyasi.
// Hujjat: https://docs.click.uz/click-api/
//
// Click ikki bosqichli ishlaydi:
//   1. Prepare — bizning serverimiz to‘lov haqiqiyligini tasdiqlaydi (status 0 qaytaramiz)
//   2. Complete — Click pul yechilganini xabar qiladi (status 0 qaytaramiz)
// Imzo: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)

import crypto from "node:crypto";

export type ClickPrepareReq = {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string;
  amount: number;
  action: 0; // prepare
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
};

export type ClickCompleteReq = ClickPrepareReq & {
  action: 1; // complete
  merchant_prepare_id: number;
};

export function clickSign(opts: {
  secret: string;
  click_trans_id: number;
  service_id: number;
  merchant_trans_id: string;
  merchant_prepare_id?: number;
  amount: number;
  action: 0 | 1;
  sign_time: string;
}): string {
  const parts = [
    opts.click_trans_id,
    opts.service_id,
    opts.secret,
    opts.merchant_trans_id,
    opts.merchant_prepare_id ?? "",
    opts.amount,
    opts.action,
    opts.sign_time,
  ];
  return crypto.createHash("md5").update(parts.join("")).digest("hex");
}

// Click formasi uchun URL — foydalanuvchi shu URL’ga yo‘naltiriladi
export function buildClickPaymentUrl(opts: {
  serviceId: number;
  merchantId: number;
  amount: number;
  transactionParam: string; // bizning ichki id (merchant_trans_id)
  returnUrl?: string;
}): string {
  const u = new URL("https://my.click.uz/services/pay");
  u.searchParams.set("service_id", String(opts.serviceId));
  u.searchParams.set("merchant_id", String(opts.merchantId));
  u.searchParams.set("amount", String(opts.amount));
  u.searchParams.set("transaction_param", opts.transactionParam);
  if (opts.returnUrl) u.searchParams.set("return_url", opts.returnUrl);
  return u.toString();
}
