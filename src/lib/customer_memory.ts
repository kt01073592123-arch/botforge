// Customer memory — long-term mijoz profili.
// Bot 2-marta kelgan mijozni eslab qoladi: nomi, til, oldingi buyurtmalar,
// AI yiqqan summary ("har kuni latte oladi", "katta buyurtma qiladi" va h.k.).

import { db } from "./supabase/server";
import { anthropic } from "./ai/anthropic";
import { env } from "./env";

export type CustomerProfile = {
  id: string;
  bot_id: string;
  tg_user_id: number;
  display_name: string | null;
  phone: string | null;
  language: string | null;
  summary: string | null;
  preferences: unknown[];
  notes: Array<{ date: string; text: string; type?: string }>;
  tags: string[];
  total_conversations: number;
  total_messages: number;
  total_orders: number;
  total_bookings: number;
  lifetime_value_uzs: number;
  last_seen_at: string;
  first_seen_at: string;
  last_summarized_at: string | null;
};

export async function getCustomerProfile(
  botId: string,
  tgUserId: number | null
): Promise<CustomerProfile | null> {
  if (!tgUserId) return null;
  const { data } = await db()
    .from("customer_profiles")
    .select("*")
    .eq("bot_id", botId)
    .eq("tg_user_id", tgUserId)
    .maybeSingle();
  return (data as CustomerProfile) ?? null;
}

export async function touchProfile(opts: {
  botId: string;
  tgUserId: number;
  displayName?: string | null;
  phone?: string | null;
  language?: string | null;
}): Promise<void> {
  await db().rpc("touch_customer_profile", {
    p_bot_id: opts.botId,
    p_tg_user_id: opts.tgUserId,
    p_display_name: opts.displayName ?? null,
    p_phone: opts.phone ?? null,
    p_language: opts.language ?? null,
  });
}

// AI engine system prompt'iga qo'shiladi
export function formatProfileForPrompt(p: CustomerProfile | null): string {
  if (!p) return "";
  const parts: string[] = ["=== CUSTOMER_MEMORY ==="];

  if (p.display_name) parts.push(`Ism: ${p.display_name}`);
  if (p.language) parts.push(`Til: ${p.language}`);
  if (p.tags?.length) parts.push(`Teglar: ${p.tags.join(", ")}`);

  const stats: string[] = [];
  if (p.total_orders > 0) stats.push(`${p.total_orders} ta buyurtma`);
  if (p.total_bookings > 0) stats.push(`${p.total_bookings} ta bron`);
  if (p.lifetime_value_uzs > 0)
    stats.push(`jami xarid: ${p.lifetime_value_uzs.toLocaleString("uz")} so'm`);
  if (stats.length) parts.push(`Tarix: ${stats.join(", ")}`);

  if (p.summary) parts.push(`\nXulosa: ${p.summary}`);
  if (p.preferences?.length)
    parts.push(`Yoqtirgan: ${p.preferences.map((x) => String(x)).join(", ")}`);

  parts.push(
    "\nMijoz qaytib kelgan — uni eslab qol, takror tanishlik so'rama, samimiy bo'l."
  );
  return parts.join("\n");
}

// ════════════════════════════════════════════════════════════
// Background summarization — suhbat oxirida yoki har 7 kun
// LLM yordamida xulosa yangilaydi
// ════════════════════════════════════════════════════════════
export async function summarizeCustomer(opts: {
  botId: string;
  tgUserId: number;
}): Promise<void> {
  const sb = db();
  const profile = await getCustomerProfile(opts.botId, opts.tgUserId);
  if (!profile) return;

  // Yetarli ma'lumot bo'lmasa o'tkazib yuboramiz
  if (profile.total_messages < 5) return;

  // Eng so'nggi 50 ta xabarni olamiz (faqat shu mijoz uchun)
  const { data: convs } = await sb
    .from("conversations")
    .select("id")
    .eq("bot_id", opts.botId)
    .eq("tg_user_id", opts.tgUserId)
    .order("last_message_at", { ascending: false })
    .limit(5);

  if (!convs || convs.length === 0) return;
  const convIds = convs.map((c) => c.id);

  const { data: msgs } = await sb
    .from("messages")
    .select("role, content")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!msgs || msgs.length === 0) return;

  const transcript = msgs
    .reverse()
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`)
    .join("\n");

  const prompt = `Sen mijoz xulosa beruvchi tahlilchisan. Quyidagi suhbatlardan mijoz haqida 2-3 jumlali qisqacha xulosa va 3-5 ta preferences ro'yxati chiqar. JSON qaytar: {"summary": string, "preferences": string[], "tags": string[]}. Tags faqat shu ro'yxatdan: ["vip", "regular", "first_time", "high_value", "complainer", "loyal", "cold"].

SUHBATLAR:
${transcript}`;

  try {
    const response = await anthropic().messages.create({
      model: env().AI_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return;

    const parsed = JSON.parse(json[0]) as {
      summary?: string;
      preferences?: unknown[];
      tags?: string[];
    };

    await sb.rpc("update_customer_summary", {
      p_bot_id: opts.botId,
      p_tg_user_id: opts.tgUserId,
      p_summary: parsed.summary ?? "",
      p_preferences: parsed.preferences ?? null,
      p_tags: parsed.tags ?? null,
    });
  } catch (e) {
    console.error("[summarizeCustomer]", (e as Error).message);
  }
}

// Summarize qilinishi kerak bo'lgan mijozlarni topadi (nightly cron uchun).
// DB shim .or() ni qo'llab-quvvatlamaydi — shu uchun 2 ta query birlashtiramiz.
export async function pickProfilesToSummarize(limit = 50): Promise<
  Array<{ bot_id: string; tg_user_id: number }>
> {
  const sb = db();
  const week = new Date(Date.now() - 7 * 86400000).toISOString();

  const [a, b] = await Promise.all([
    sb
      .from("customer_profiles")
      .select("bot_id, tg_user_id")
      .is("summary", null)
      .gte("total_messages", 5)
      .order("last_seen_at", { ascending: false })
      .limit(limit),
    sb
      .from("customer_profiles")
      .select("bot_id, tg_user_id, last_summarized_at")
      .lt("last_summarized_at", week)
      .gte("total_messages", 5)
      .order("last_seen_at", { ascending: false })
      .limit(limit),
  ]);

  const seen = new Set<string>();
  const out: Array<{ bot_id: string; tg_user_id: number }> = [];
  for (const row of [...(a.data ?? []), ...(b.data ?? [])]) {
    const r = row as { bot_id: string; tg_user_id: number };
    const key = `${r.bot_id}|${r.tg_user_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ bot_id: r.bot_id, tg_user_id: r.tg_user_id });
    if (out.length >= limit) break;
  }
  return out;
}
