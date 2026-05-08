// AI Engine — Anthropic Claude. Tool use (save_lead, request_human) + prompt caching.

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropic";
import { db } from "../supabase/server";
import { env } from "../env";
import { searchKnowledge } from "../kb";
import type { BotRow, BotData, MessageRow } from "../supabase/types";

export type AiAction =
  | { type: "send"; text: string }
  | { type: "save_lead"; name?: string; phone?: string; request?: string }
  | { type: "request_human"; reason?: string };

const TOOLS: Anthropic.Tool[] = [
  {
    name: "save_lead",
    description:
      "Mijoz aloqa qoldirgan bo‘lsa (ism, telefon yoki aniq talab) shu funksiyani chaqir.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Mijoz ismi" },
        phone: { type: "string", description: "Telefon raqami" },
        request: { type: "string", description: "Mijozning talabi/savoli" },
      },
    },
  },
  {
    name: "request_human",
    description:
      "Mijoz operator bilan gaplashishni so‘rasa yoki javob bera olmasang shuni chaqir.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Nega operator kerak" },
      },
    },
  },
];

function buildBusinessContext(bot: BotRow, bd: BotData | null): string {
  const lines: string[] = [];
  lines.push(`BIZNES NOMI: ${bot.business_name ?? bot.name}`);
  if (bot.language) lines.push(`TIL: ${bot.language}`);
  if (bd?.services?.length) {
    lines.push("\nMAHSULOTLAR VA XIZMATLAR:");
    // Kategoriya bo‘yicha guruhlash, agar mavjud bo‘lsa
    const cats = bd.categories ?? [];
    const byCat = new Map<string | null, typeof bd.services>();
    for (const s of bd.services) {
      const key = s.category_id ?? null;
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(s);
    }
    const sortedCats = [
      ...cats.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      { id: null, name: "Boshqa" },
    ];
    for (const cat of sortedCats) {
      const items = byCat.get(cat.id as string | null) ?? [];
      if (items.length === 0) continue;
      if (cats.length > 0 && cat.id !== null) lines.push(`\n[${cat.name}]`);
      for (const s of items) {
        const dur = s.duration ? ` (${s.duration})` : "";
        const desc = s.description ? ` — ${s.description}` : "";
        const stockMark = s.in_stock === false ? " [HOZIR YO‘Q]" : "";
        const photoMark = s.photo_url ? " [rasmi bor]" : "";
        lines.push(`- ${s.name} — ${s.price}${dur}${desc}${stockMark}${photoMark}`);
      }
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

// History’ni Anthropic formatiga aylantirish.
// 1-xabar `user` bo‘lishi shart. Boshlovchi `assistant` xabarlarni tashlaymiz.
function toAnthropicMessages(
  history: Pick<MessageRow, "role" | "content">[]
): Anthropic.MessageParam[] {
  const filtered = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  // Boshidagi assistant xabarlarni olib tashlaymiz
  while (filtered.length && filtered[0].role !== "user") filtered.shift();
  return filtered;
}

export async function generateReply(opts: {
  bot: BotRow;
  history: Pick<MessageRow, "role" | "content">[];
}): Promise<{
  actions: AiAction[];
  usage: { prompt: number; completion: number };
}> {
  const { data: bdRow } = await db()
    .from("bot_data")
    .select("*")
    .eq("bot_id", opts.bot.id)
    .maybeSingle();
  const bd = bdRow as BotData | null;

  // RAG (KB embeddings) — agar OPENAI_API_KEY o‘rnatilmagan bo‘lsa, kb hits = []
  const lastUserMsg =
    [...opts.history].reverse().find((m) => m.role === "user")?.content ?? "";
  const kbHits = await searchKnowledge({
    botId: opts.bot.id,
    query: lastUserMsg,
    limit: 3,
  });
  const kbBlock =
    kbHits.length > 0
      ? `=== KNOWLEDGE_BASE (relevant) ===\n${kbHits
          .map((h, i) => `[${i + 1}] ${h.content}`)
          .join("\n\n")}`
      : "";

  // System: barqaror qism (cache qilinadi) + KB qism (har turda o‘zgaradi, cache qilinmaydi)
  const stableSystem = [
    opts.bot.system_prompt ?? "",
    "\n\n=== BUSINESS_CONTEXT ===\n",
    buildBusinessContext(opts.bot, bd),
  ].join("\n");

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: stableSystem,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (kbBlock) {
    systemBlocks.push({ type: "text", text: kbBlock });
  }

  const model = opts.bot.ai_model || env().AI_MODEL;

  const response = await anthropic().messages.create({
    model,
    max_tokens: 800,
    system: systemBlocks,
    messages: toAnthropicMessages(opts.history),
    tools: TOOLS,
  });

  const actions: AiAction[] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      const txt = block.text.trim();
      if (txt) actions.push({ type: "send", text: txt });
    } else if (block.type === "tool_use") {
      const input = block.input as Record<string, unknown>;
      if (block.name === "save_lead") {
        actions.push({
          type: "save_lead",
          name: input.name as string | undefined,
          phone: input.phone as string | undefined,
          request: input.request as string | undefined,
        });
      } else if (block.name === "request_human") {
        actions.push({
          type: "request_human",
          reason: input.reason as string | undefined,
        });
      }
    }
  }

  // Agar AI faqat tool ishlatib hech narsa demagan bo‘lsa, qo‘shimcha javob
  if (actions.filter((a) => a.type === "send").length === 0) {
    actions.push({ type: "send", text: "Aniqlashtirib, admin javob beradi 🙏" });
  }

  return {
    actions,
    usage: {
      prompt:
        response.usage.input_tokens +
        (response.usage.cache_creation_input_tokens ?? 0) +
        (response.usage.cache_read_input_tokens ?? 0),
      completion: response.usage.output_tokens,
    },
  };
}

// Anthropic narxlari ($/1M token). Cache read ~10% input narxi, lekin biz o‘rtacha hisoblaymiz.
// https://www.anthropic.com/pricing
export function estimateCostUsd(
  model: string,
  prompt: number,
  completion: number
): number {
  const rates: Record<string, [number, number]> = {
    "claude-haiku-4-5": [1 / 1_000_000, 5 / 1_000_000],
    "claude-sonnet-4-6": [3 / 1_000_000, 15 / 1_000_000],
    "claude-opus-4-7": [5 / 1_000_000, 25 / 1_000_000],
    "claude-opus-4-6": [5 / 1_000_000, 25 / 1_000_000],
  };
  const [pi, po] = rates[model] ?? rates["claude-haiku-4-5"];
  return prompt * pi + completion * po;
}
