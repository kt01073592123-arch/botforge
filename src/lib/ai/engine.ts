// AI Engine — bitta universal funksiya: bot config va suhbat tarixi asosida javob beradi.
// Tool calls: save_lead, request_human. Boshqa tool kerak bo‘lsa shu joyga qo‘shasan.

import { openai } from "./openai";
import { db } from "../supabase/server";
import { env } from "../env";
import { searchKnowledge } from "../kb";
import type { BotRow, BotData, MessageRow } from "../supabase/types";

export type AiAction =
  | { type: "send"; text: string }
  | { type: "save_lead"; name?: string; phone?: string; request?: string }
  | { type: "request_human"; reason?: string };

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "save_lead",
      description:
        "Mijoz aloqa qoldirgan bo‘lsa (ism, telefon yoki aniq talab) shu funksiyani chaqir.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Mijoz ismi" },
          phone: { type: "string", description: "Telefon raqami" },
          request: { type: "string", description: "Mijozning talabi/savoli" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "request_human",
      description:
        "Mijoz operator bilan gaplashishni so‘rasa yoki javob bera olmasang shuni chaqir.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Nega operator kerak" },
        },
      },
    },
  },
];

function buildBusinessContext(bot: BotRow, bd: BotData | null): string {
  const lines: string[] = [];
  lines.push(`BIZNES NOMI: ${bot.business_name ?? bot.name}`);
  if (bot.language) lines.push(`TIL: ${bot.language}`);
  if (bd?.services?.length) {
    lines.push("\nXIZMATLAR VA NARXLAR:");
    for (const s of bd.services) {
      const dur = s.duration ? ` (${s.duration})` : "";
      lines.push(`- ${s.name} — ${s.price}${dur}`);
    }
  }
  if (bd?.working_hours && Object.keys(bd.working_hours).length) {
    lines.push("\nISH VAQTI:");
    const days: Record<string, string> = {
      mon: "Du", tue: "Se", wed: "Ch", thu: "Pa", fri: "Ju", sat: "Sh", sun: "Ya",
    };
    for (const [d, h] of Object.entries(bd.working_hours)) {
      if (!h) lines.push(`- ${days[d] ?? d}: dam`);
      else lines.push(`- ${days[d] ?? d}: ${h[0]}:00–${h[1]}:00`);
    }
  }
  if (bd?.contacts && Object.keys(bd.contacts).length) {
    lines.push("\nALOQA:");
    if (bd.contacts.phone) lines.push(`- Tel: ${bd.contacts.phone}`);
    if (bd.contacts.address) lines.push(`- Manzil: ${bd.contacts.address}`);
    if (bd.contacts.instagram) lines.push(`- Instagram: ${bd.contacts.instagram}`);
  }
  if (bd?.faq?.length) {
    lines.push("\nFAQ:");
    for (const f of bd.faq) lines.push(`Q: ${f.q}\nA: ${f.a}`);
  }
  return lines.join("\n");
}

export async function generateReply(opts: {
  bot: BotRow;
  history: Pick<MessageRow, "role" | "content">[];
}): Promise<{ actions: AiAction[]; usage: { prompt: number; completion: number } }> {
  const { data: bdRow } = await db()
    .from("bot_data")
    .select("*")
    .eq("bot_id", opts.bot.id)
    .maybeSingle();
  const bd = bdRow as BotData | null;

  // RAG: oxirgi user xabari asosida tegishli ma'lumot bo‘laklarini topamiz
  const lastUserMsg = [...opts.history].reverse().find((m) => m.role === "user")?.content ?? "";
  const kbHits = await searchKnowledge({ botId: opts.bot.id, query: lastUserMsg, limit: 3 });
  const kbBlock =
    kbHits.length > 0
      ? `\n\n=== KNOWLEDGE_BASE (relevant) ===\n${kbHits
          .map((h, i) => `[${i + 1}] ${h.content}`)
          .join("\n\n")}\n`
      : "";

  const system = [
    opts.bot.system_prompt ?? "",
    "\n\n=== BUSINESS_CONTEXT ===\n",
    buildBusinessContext(opts.bot, bd),
    kbBlock,
  ].join("\n");

  const messages = [
    { role: "system" as const, content: system },
    ...opts.history.map((m) => ({
      role: m.role === "tool" ? ("system" as const) : (m.role as "user" | "assistant" | "system"),
      content: m.content,
    })),
  ];

  const completion = await openai().chat.completions.create({
    model: opts.bot.ai_model || env().AI_MODEL,
    messages,
    tools: TOOLS,
    tool_choice: "auto",
    temperature: 0.4,
    max_tokens: 600,
  });

  const choice = completion.choices[0];
  const msg = choice.message;
  const actions: AiAction[] = [];

  if (msg.tool_calls?.length) {
    for (const tc of msg.tool_calls) {
      try {
        const args = JSON.parse(tc.function.arguments || "{}");
        if (tc.function.name === "save_lead") {
          actions.push({ type: "save_lead", ...args });
        } else if (tc.function.name === "request_human") {
          actions.push({ type: "request_human", reason: args.reason });
        }
      } catch { /* noto‘g‘ri JSON ni o‘tkazib yuboramiz */ }
    }
  }
  if (msg.content && msg.content.trim()) {
    actions.push({ type: "send", text: msg.content.trim() });
  }
  // Agar AI faqat tool ishlatib hech narsa demagan bo‘lsa, ehtiyot uchun standart javob
  if (actions.filter((a) => a.type === "send").length === 0) {
    actions.push({ type: "send", text: "Aniqlashtirib, admin javob beradi 🙏" });
  }

  return {
    actions,
    usage: {
      prompt: completion.usage?.prompt_tokens ?? 0,
      completion: completion.usage?.completion_tokens ?? 0,
    },
  };
}

// Narx hisobi (gpt-4o-mini taxminiy: $0.15/M input, $0.60/M output)
export function estimateCostUsd(model: string, prompt: number, completion: number): number {
  const rates: Record<string, [number, number]> = {
    "gpt-4o-mini": [0.15 / 1_000_000, 0.6 / 1_000_000],
    "gpt-4o":      [2.5 / 1_000_000, 10 / 1_000_000],
    "gpt-4.1-mini": [0.4 / 1_000_000, 1.6 / 1_000_000],
  };
  const [pi, po] = rates[model] ?? rates["gpt-4o-mini"];
  return prompt * pi + completion * po;
}
