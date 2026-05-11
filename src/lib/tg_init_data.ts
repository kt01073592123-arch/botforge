// Telegram WebApp initData HMAC verify.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

import crypto from "node:crypto";

export type TgInitUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TgInitResult = {
  valid: boolean;
  user?: TgInitUser;
  auth_date?: number;
  error?: string;
};

// Telegram'ning algoritmi:
//   secret_key = HMAC_SHA256(bot_token, "WebAppData")
//   data_check_string = qatorlangan kalit=qiymat lar (alfabetik tartib, hash'siz)
//   hash == HMAC_SHA256(secret_key, data_check_string)
export function verifyTgInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 3600 * 24,
): TgInitResult {
  if (!initData || !botToken) {
    return { valid: false, error: "Bo'sh initData yoki bot token" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { valid: false, error: "Yaroqsiz format" };
  }

  const hash = params.get("hash");
  if (!hash) return { valid: false, error: "Hash topilmadi" };

  // Hash o'chirib qoldiq qatorlangan key=value, alfabetik
  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k !== "hash") pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (expected !== hash) {
    return { valid: false, error: "Hash mos kelmadi" };
  }

  // auth_date juda eski bo'lmasligi kerak (replay attack'dan himoya)
  const authDate = Number(params.get("auth_date") ?? 0);
  if (authDate && Date.now() / 1000 - authDate > maxAgeSec) {
    return { valid: false, error: "initData muddati tugagan" };
  }

  // User ma'lumotini parse qilish
  let user: TgInitUser | undefined;
  const userStr = params.get("user");
  if (userStr) {
    try {
      user = JSON.parse(userStr) as TgInitUser;
    } catch {
      return { valid: false, error: "User parse error" };
    }
  }

  return { valid: true, user, auth_date: authDate };
}
