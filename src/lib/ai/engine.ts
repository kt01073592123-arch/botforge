// AI Engine — Anthropic Claude. Multi-turn tool loop + customer memory + KB RAG.
//
// Eski versiya: faqat 2 ta tool, bitta turda to'xtab qolardi.
// Yangi versiya:
//   - 8 ta tool (booking, order, payment, KB search, ...)
//   - while(stop_reason === "tool_use") loop — tool natijasi keyingi turga input
//   - customer_profiles dan long-term memory
//   - prompt caching (system + tools)

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropic";
import { db } from "../supabase/server";
import { env } from "../env";
import { searchKnowledge } from "../kb";
import { TOOL_DEFINITIONS, executeTool, type ToolEffect, type ToolContext } from "./tools";
import { getCustomerProfile, formatProfileForPrompt } from "../customer_memory";
import type { BotRow, BotData, MessageRow, ConversationRow } from "../supabase/types";

export type AiAction =
  | { type: "send"; text: string }
  | { type: "effect"; effect: ToolEffect };

const MAX_TOOL_ITERATIONS = 5; // Cheksiz loop oldini olish

function buildBusinessContext(bot: BotRow, bd: BotData | null): string {
  const lines: string[] = [];
  lines.push(`BIZNES NOMI: ${bot.business_name ?? bot.name}`);
  if (bot.language) lines.push(`TIL: ${bot.language}`);
  if (bd?.services?.length) {
    lines.push("\nMAHSULOTLAR VA XIZMATLAR:");
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
        const stockMark = s.in_stock === false ? " [HOZIR YO'Q]" : "";
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

function toAnthropicMessages(
  history: Pick<MessageRow, "role" | "content">[]
): Anthropic.MessageParam[] {
  const filtered = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  while (filtered.length && filtered[0].role !== "user") filtered.shift();
  return filtered;
}

export async function generateReply(opts: {
  bot: BotRow;
  conv: ConversationRow;
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

  // Customer profile (long-term memory)
  const profile = await getCustomerProfile(opts.bot.id, opts.conv.tg_user_id);
  const memoryBlock = formatProfileForPrompt(profile);

  // RAG (KB)
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

  // System: cache qilinadigan barqaror qism + dinamik qism
  const stableSystem = [
    opts.bot.system_prompt ?? "",
    "\n\n=== BUSINESS_CONTEXT ===\n",
    buildBusinessContext(opts.bot, bd),
    "\n\n=== TOOL_USAGE_RULES ===",
    "- Mijoz operator so'rasa darhol request_human chaqir.",
    "- Bron qilishdan oldin check_availability bilan bo'sh slotni tekshir.",
    "- Buyurtma yaratganingdan keyin send_payment_link chaqir.",
    "- Sen bilmagan biror narsa so'ralsa search_knowledge chaqir.",
    "- Mijoz kontakt qoldirsa save_lead chaqir (parallel ravishda javob ham yoz).",
  ].join("\n");

  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: stableSystem, cache_control: { type: "ephemeral" } },
  ];
  if (memoryBlock) systemBlocks.push({ type: "text", text: memoryBlock });
  if (kbBlock) systemBlocks.push({ type: "text", text: kbBlock });

  const model = opts.bot.ai_model || env().AI_MODEL;
  const toolCtx: ToolContext = { bot: opts.bot, conv: opts.conv, bd };

  // Multi-turn tool loop
  const messages: Anthropic.MessageParam[] = toAnthropicMessages(opts.history);
  const actions: AiAction[] = [];
  let totalPrompt = 0;
  let totalCompletion = 0;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = await anthropic().messages.create({
      model,
      max_tokens: 1024,
      system: systemBlocks,
      messages,
      tools: TOOL_DEFINITIONS,
    });

    totalPrompt +=
      response.usage.input_tokens +
      (response.usage.cache_creation_input_tokens ?? 0) +
      (response.usage.cache_read_input_tokens ?? 0);
    totalCompletion += response.usage.output_tokens;

    // Assistant javobini messages'ga qo'shamiz (keyingi turda kerak)
    messages.push({ role: "assistant", content: response.content });

    // Matn bloklarini darhol "send" actionga aylantiramiz
    for (const block of response.content) {
      if (block.type === "text") {
        const txt = block.text.trim();
        if (txt) actions.push({ type: "send", text: txt });
      }
    }

    // Tool use bo'lmasa loop tugadi
    if (response.stop_reason !== "tool_use") break;

    // Hamma tool_use bloklarini bajaramiz va tool_result xabari yasaymiz
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (toolUseBlocks.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUseBlocks) {
      try {
        const result = await executeTool(tu.name, tu.input as Record<string, unknown>, toolCtx);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result.content,
        });
        if (result.effects) {
          for (const eff of result.effects) {
            actions.push({ type: "effect", effect: eff });
          }
        }
      } catch (e) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Tool xato: ${(e as Error).message}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  // Loop hech qanday matn ishlab chiqarmasa fallback
  if (actions.filter((a) => a.type === "send").length === 0) {
    actions.push({ type: "send", text: "Aniqlashtirib, admin javob beradi 🙏" });
  }

  return {
    actions,
    usage: { prompt: totalPrompt, completion: totalCompletion },
  };
}

// Anthropic narxlari ($/1M token).
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
