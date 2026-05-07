// Supabase-based fixed-window rate limit.
// Bitta RPC chaqiriq: agar limit oshmagan bo‘lsa true qaytaradi va counter +1.

import { db } from "./supabase/server";

type Scope = "tg_chat" | "api_ip" | "api_user";

export async function rateLimit(opts: {
  scope: Scope;
  key: string;
  windowSeconds: number;
  limit: number;
}): Promise<boolean> {
  const { data, error } = await db().rpc("rate_limit_check", {
    p_scope: opts.scope,
    p_key: opts.key,
    p_window_seconds: opts.windowSeconds,
    p_limit: opts.limit,
  });
  if (error) {
    // DB tushgan paytda ham ilova ishlasin — fail open
    console.error("[rateLimit] error", error.message);
    return true;
  }
  return data === true;
}

// Helper: Vercel/Cloudflare/standart proxy oldidagi IP
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0]?.trim();
  return ip || req.headers.get("x-real-ip") || "0.0.0.0";
}
