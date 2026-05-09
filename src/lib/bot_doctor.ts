// Bot Doctor — AI'ga suhbatlarni tahlil qildirib, bot egasiga konkret yaxshilash
// takliflari beradi. Bu sizning differentiator'ingiz: hech qanday raqib bunday qilmaydi.
//
// Misol natija:
//   {
//     suggestions: [
//       {
//         type: "missing_info",
//         severity: "high",
//         title: "Mijozlarning 14% 'narx qancha?' deb so'radi, lekin bot javob bermadi",
//         before: "Hozirgi prompt: 'Sen do'kon assistantsisan...'",
//         after: "Tavsiya: services'ga aniq narxlar qo'shing yoki search_kb'ga price ma'lumotini",
//         rationale: "Bu mijozlar 73% holatlarda lead qoldirmadi",
//       }
//     ]
//   }

import { db } from "./supabase/server";
import { anthropic } from "./ai/anthropic";
import { env } from "./env";
import type { BotRow } from "./supabase/types";

export type Suggestion = {
  type: "missing_info" | "tone" | "tool_usage" | "knowledge_gap" | "ux";
  severity: "high" | "medium" | "low";
  title: string;
  before?: string;
  after?: string;
  rationale: string;
};

export async function diagnoseBot(botId: string, days = 7): Promise<{
  diagId: string;
  suggestionsCount: number;
} | null> {
  const sb = db();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const until = new Date().toISOString();

  // Bot ma'lumotlari
  const { data: bot } = await sb.from("bots").select("*").eq("id", botId).maybeSingle();
  if (!bot) return null;
  const b = bot as BotRow;

  // Statistika
  const { count: convCount } = await sb
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("created_at", since);

  const { count: msgCount } = await sb
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("created_at", since);

  const { count: leadCount } = await sb
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("created_at", since);

  const { count: bookingCount } = await sb
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("created_at", since);

  const { count: orderCount } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("created_at", since);

  // Yetarli ma'lumot bo'lmasa o'tkazib yuboramiz
  if ((msgCount ?? 0) < 20) return null;

  // Eng so'nggi 100 ta foydalanuvchi xabari (sample)
  const { data: userMsgs } = await sb
    .from("messages")
    .select("content, created_at")
    .eq("bot_id", botId)
    .eq("role", "user")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  // Lead qoldirmagan suhbatlardan oxirgi 30 ta xabar (failure mode'larni topish)
  const { data: failedConvs } = await sb
    .from("conversations")
    .select("id, customer_name")
    .eq("bot_id", botId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  const failedTranscripts: string[] = [];
  if (failedConvs && failedConvs.length > 0) {
    const convIds = failedConvs.map((c) => c.id);
    // Lead qaysi conversationlarda saqlangan?
    const { data: leadConvs } = await sb
      .from("leads")
      .select("conversation_id")
      .in("conversation_id", convIds);
    const leadConvSet = new Set(leadConvs?.map((l) => l.conversation_id) ?? []);
    const noLeadIds = convIds.filter((id) => !leadConvSet.has(id)).slice(0, 5);

    for (const convId of noLeadIds) {
      const { data: msgs } = await sb
        .from("messages")
        .select("role, content")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(20);
      if (msgs && msgs.length > 2) {
        failedTranscripts.push(
          msgs.map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}`).join("\n")
        );
      }
    }
  }

  // ───── AI ga tahlil so'rovi ─────
  const userQuestionSample = (userMsgs ?? [])
    .slice(0, 50)
    .map((m) => `- ${m.content.slice(0, 200)}`)
    .join("\n");

  const failedSample = failedTranscripts.slice(0, 3).map((t, i) => `\n--- Suhbat ${i + 1} ---\n${t}`).join("\n");

  const prompt = `Sen Telegram AI bot tahlilchisisan. Quyidagi ma'lumotlarga qarab bot egasiga 3-5 ta konkret yaxshilash taklifi ber. JSON formatda javob ber:

{
  "insights": {
    "top_questions": ["...", "..."],
    "missing_info": ["..."],
    "conversion_pct": 0.XX,
    "satisfaction_estimate": "yaxshi" | "o'rta" | "yomon"
  },
  "suggestions": [
    {
      "type": "missing_info" | "tone" | "tool_usage" | "knowledge_gap" | "ux",
      "severity": "high" | "medium" | "low",
      "title": "...",
      "before": "...",
      "after": "...",
      "rationale": "..."
    }
  ]
}

═══ BOT MA'LUMOTI ═══
Nomi: ${b.name}
Biznes: ${b.business_name ?? "—"}
System prompt: ${(b.system_prompt ?? "").slice(0, 800)}

═══ STATISTIKA (${days} kun) ═══
Suhbatlar: ${convCount ?? 0}
Xabarlar: ${msgCount ?? 0}
Lead'lar: ${leadCount ?? 0} (konversiya: ${convCount ? Math.round(((leadCount ?? 0) / convCount) * 100) : 0}%)
Bron: ${bookingCount ?? 0}
Buyurtma: ${orderCount ?? 0}

═══ SO'NGGI MIJOZ SAVOLLARI (sample) ═══
${userQuestionSample}

═══ LEAD QOLDIRMAGAN SUHBATLAR (failure mode'lar) ═══
${failedSample || "(yo'q)"}

Faqat JSON qaytar. Boshqa matn yozma.`;

  let parsed: { insights?: unknown; suggestions?: Suggestion[] } = {};
  try {
    const response = await anthropic().messages.create({
      model: env().AI_MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((blk): blk is { type: "text"; text: string } => blk.type === "text")
      .map((blk) => blk.text)
      .join("");
    const json = text.match(/\{[\s\S]*\}/);
    if (json) parsed = JSON.parse(json[0]);
  } catch (e) {
    console.error("[botDoctor] AI failed:", (e as Error).message);
    return null;
  }

  // Saqlash
  const { data: diag, error } = await sb
    .from("bot_diagnostics")
    .insert({
      bot_id: botId,
      period_start: since,
      period_end: until,
      total_conversations: convCount ?? 0,
      total_messages: msgCount ?? 0,
      total_leads: leadCount ?? 0,
      total_bookings: bookingCount ?? 0,
      total_orders: orderCount ?? 0,
      insights: parsed.insights ?? {},
      suggestions: parsed.suggestions ?? [],
    })
    .select("id")
    .single();
  if (error) {
    console.error("[botDoctor] insert:", error.message);
    return null;
  }

  // Bot egasiga Telegram orqali xabar (agar admin_chat_id bor bo'lsa)
  if (b.admin_chat_id && (parsed.suggestions?.length ?? 0) > 0) {
    try {
      const { TgBot } = await import("./telegram");
      const platformBot = new TgBot(env().TELEGRAM_BOT_TOKEN);
      const top = (parsed.suggestions ?? []).slice(0, 3);
      const text = [
        `🩺 <b>Bot Doctor — haftalik tahlil</b>`,
        `Bot: ${b.name}`,
        `${convCount ?? 0} suhbat, ${leadCount ?? 0} lead, ${bookingCount ?? 0} bron`,
        ``,
        `<b>Top takliflar:</b>`,
        ...top.map(
          (s, i) => `${i + 1}. [${s.severity.toUpperCase()}] ${s.title}\n   → ${s.rationale}`
        ),
        ``,
        `Batafsil: ${env().NEXT_PUBLIC_APP_URL}/app/bots/${botId}/diagnostics`,
      ].join("\n");
      await platformBot.sendMessage(b.admin_chat_id, text);
    } catch (e) {
      console.error("[botDoctor] notify:", (e as Error).message);
    }
  }

  return { diagId: diag.id, suggestionsCount: parsed.suggestions?.length ?? 0 };
}

// Hamma faol botlarni tahlil qiladi (cron'dan chaqiriladi)
export async function diagnoseAllBots(): Promise<{ total: number; succeeded: number }> {
  const sb = db();
  const { data: bots } = await sb
    .from("bots")
    .select("id")
    .eq("status", "active")
    .is("deleted_at", null);

  let succeeded = 0;
  for (const b of bots ?? []) {
    try {
      const r = await diagnoseBot(b.id, 7);
      if (r) succeeded++;
    } catch (e) {
      console.error(`[botDoctor] ${b.id} failed:`, (e as Error).message);
    }
  }
  return { total: bots?.length ?? 0, succeeded };
}
