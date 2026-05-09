// Custom domain helper — bot egasi o'z domenini ulashi (white-label).
//
// Foydalanuvchi domenni qo'shadi → biz verification token beramiz.
// Foydalanuvchi DNS'da CNAME yoki TXT yozadi → biz verify qilamiz.
// Verify bo'lgach, middleware (next config) shu domenni ushlab to'g'ri bot'ga
// yo'naltiradi.

import { db } from "./supabase/server";
import { randomBytes } from "node:crypto";

export type CustomDomain = {
  id: string;
  bot_id: string;
  domain: string;
  is_verified: boolean;
  verification_token: string | null;
  ssl_provisioned: boolean;
  created_at: string;
  verified_at: string | null;
};

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

export function normalizeDomain(input: string): string | null {
  const d = String(input ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!DOMAIN_RE.test(d)) return null;
  if (d.endsWith(".vercel.app") || d.endsWith(".telegram.org")) return null;
  return d;
}

export async function addDomain(botId: string, rawDomain: string): Promise<CustomDomain | { error: string }> {
  const domain = normalizeDomain(rawDomain);
  if (!domain) return { error: "Domen noto'g'ri formatda" };

  // Boshqa botda mavjud bo'lsa rad qilamiz
  const { data: existing } = await db()
    .from("custom_domains")
    .select("id, bot_id")
    .eq("domain", domain)
    .maybeSingle();
  if (existing) {
    if ((existing as { bot_id: string }).bot_id === botId) {
      return existing as unknown as CustomDomain;
    }
    return { error: "Bu domen boshqa bot uchun ulangan" };
  }

  const token = randomBytes(16).toString("hex");
  const { data, error } = await db()
    .from("custom_domains")
    .insert({
      bot_id: botId,
      domain,
      verification_token: token,
    })
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "insert failed" };
  return data as unknown as CustomDomain;
}

export async function listDomains(botId: string): Promise<CustomDomain[]> {
  const { data } = await db()
    .from("custom_domains")
    .select("*")
    .eq("bot_id", botId);
  return (data ?? []) as unknown as CustomDomain[];
}

export async function removeDomain(botId: string, domain: string): Promise<boolean> {
  const d = normalizeDomain(domain);
  if (!d) return false;
  await db().from("custom_domains").delete().eq("bot_id", botId).eq("domain", d);
  return true;
}

// CNAME tekshiruvi — faqat node:dns ishlatamiz
export async function verifyDomain(botId: string, rawDomain: string): Promise<{ ok: boolean; reason?: string }> {
  const domain = normalizeDomain(rawDomain);
  if (!domain) return { ok: false, reason: "Domen noto'g'ri" };

  const sb = db();
  const { data: row } = await sb
    .from("custom_domains")
    .select("*")
    .eq("bot_id", botId)
    .eq("domain", domain)
    .maybeSingle();
  if (!row) return { ok: false, reason: "Domen topilmadi" };

  // CNAME tekshirish
  try {
    // dynamic import — Edge runtime'da bo'lmasa ham ishlaydi
    const dns = await import("node:dns/promises");
    const cnameRecords = await dns.resolveCname(domain).catch(() => [] as string[]);
    const apex = await dns.resolve4(domain).catch(() => [] as string[]);
    const hasCname = cnameRecords.some((c) => c.includes("vercel"));
    const hasApex = apex.includes("76.76.21.21"); // Vercel default A
    if (!hasCname && !hasApex) {
      return {
        ok: false,
        reason: `CNAME yoki A yozuv topilmadi. CNAME → cname.vercel-dns.com qo'shing.`,
      };
    }
  } catch (e) {
    return { ok: false, reason: `DNS xato: ${(e as Error).message}` };
  }

  await sb
    .from("custom_domains")
    .update({ is_verified: true, verified_at: new Date().toISOString() })
    .eq("bot_id", botId)
    .eq("domain", domain);

  return { ok: true };
}

// Middleware uchun: domen → bot ID lookup
export async function getBotIdByDomain(domain: string): Promise<string | null> {
  const d = normalizeDomain(domain);
  if (!d) return null;
  const { data } = await db()
    .from("custom_domains")
    .select("bot_id")
    .eq("domain", d)
    .eq("is_verified", true)
    .maybeSingle();
  return ((data as { bot_id: string } | null)?.bot_id) ?? null;
}
