// Telegram update'ni qayta ishlovchi runtime — bot uchun universal.
// Sprint 1: multi-turn AI engine + tool effects + customer memory.
// Sprint 2: voice (Whisper) + photo (Vision) input.

import { db } from "./supabase/server";
import { TgBot } from "./telegram";
import { getBotToken } from "./bots";
import { generateReply, estimateCostUsd, type AiAction } from "./ai/engine";
import { rateLimit } from "./ratelimit";
import { alertOwner } from "./alerts";
import { touchProfile } from "./customer_memory";
import { transcribeVoice, describePhoto } from "./ai/multimodal";
import type { BotRow, ConversationRow, MessageRow } from "./supabase/types";
import type { TgUpdate, TgMessage, TgCallbackQuery } from "./telegram";

function buildKeyboard(buttons: string[]) {
  if (buttons.length === 0) return undefined;
  const rows = [
    ...buttons.map((t) => [{ text: t }]),
    [{ text: "📞 Telefon raqamimni yuborish", request_contact: true }],
  ];
  return { keyboard: rows, resize_keyboard: true };
}

function inlineReplies() {
  return {
    inline_keyboard: [
      [
        { text: "🛟 Operator", callback_data: "request_human" },
        { text: "🔁 Boshidan", callback_data: "restart" },
      ],
    ],
  };
}

export async function handleUpdate(bot: BotRow, update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    return handleCallback(bot, update.callback_query);
  }

  const msg = update.message ?? update.edited_message;
  if (!msg) return;

  // ─── Inputni tushunish (text / voice / photo / contact) ───────────────
  let text = (msg.text ?? "").trim();
  const isVoice = !!msg.voice || !!msg.audio;
  const isPhoto = !!msg.photo && msg.photo.length > 0;

  if (!text && !msg.contact && !isVoice && !isPhoto) return;
  if (bot.status !== "active") return;
  if (bot.monthly_messages_used >= bot.monthly_message_limit) {
    await alertOwner({ botId: bot.id, kind: "limit_reached" });
    return;
  }

  const ok = await rateLimit({
    scope: "tg_chat",
    key: `${bot.id}|${msg.chat.id}`,
    windowSeconds: 30,
    limit: 10,
  });
  if (!ok) return;

  const sb = db();
  const token = await getBotToken(bot.id);
  const tg = new TgBot(token);

  const conv = await getOrCreateConversation(bot.id, msg);

  // Customer profile — touch (counters, last_seen)
  if (msg.from?.id) {
    await touchProfile({
      botId: bot.id,
      tgUserId: msg.from.id,
      displayName:
        [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || null,
      phone: msg.contact?.phone_number ?? null,
      language: msg.from.language_code ?? null,
    }).catch(() => {});
  }

  // /start — welcome
  if (text === "/start") {
    if (bot.welcome_message) {
      const buttons = await getDefaultButtons(bot);
      await tg.sendMessage(msg.chat.id, bot.welcome_message, {
        reply_markup: buildKeyboard(buttons),
      });
      await sb.from("messages").insert({
        conversation_id: conv.id,
        bot_id: bot.id,
        role: "assistant",
        content: bot.welcome_message,
      });
    }
    return;
  }

  // ─── Voice / Photo → matn ────────────────────────────────────────────
  if (isVoice && !text) {
    try {
      const fileId = msg.voice?.file_id ?? msg.audio?.file_id;
      if (fileId) {
        const transcript = await transcribeVoice(token, fileId);
        text = transcript || "[Ovozli xabar — matnga aylantirib bo'lmadi]";
      }
    } catch (e) {
      console.error("[voice]", (e as Error).message);
      text = "[Ovozli xabar tushunilmadi]";
    }
  }

  if (isPhoto && !text) {
    try {
      const largest = msg.photo![msg.photo!.length - 1];
      const desc = await describePhoto(token, largest.file_id, msg.caption);
      text = desc;
    } catch (e) {
      console.error("[photo]", (e as Error).message);
      text = msg.caption ?? "[Rasm yuborildi]";
    }
  }

  // Contact
  let userText = text;
  if (msg.contact) {
    userText = `[Mijoz telefon yubordi: ${msg.contact.phone_number}]`;
    await sb
      .from("conversations")
      .update({ customer_phone: msg.contact.phone_number })
      .eq("id", conv.id);
  }

  await sb.from("messages").insert({
    conversation_id: conv.id,
    bot_id: bot.id,
    role: "user",
    content: userText,
    tg_message_id: msg.message_id,
  });

  if (conv.status === "waiting_human") {
    await tg
      .sendMessage(msg.chat.id, "Xabaringizni operatorga uzatdim. Tez orada javob beramiz 🙏")
      .catch(() => {});
    return;
  }

  await tg.sendChatAction(msg.chat.id, "typing").catch(() => {});

  const { data: history } = await sb
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(30);

  let result;
  try {
    result = await generateReply({
      bot,
      conv,
      history: (history ?? []) as Pick<MessageRow, "role" | "content">[],
    });
  } catch (e) {
    const m = (e as Error).message;
    await alertOwner({ botId: bot.id, kind: "ai_error", details: m });
    await tg
      .sendMessage(msg.chat.id, "Hozir texnik xatolik. Tez orada hal qilamiz, kechirasiz 🙏")
      .catch(() => {});
    return;
  }

  for (const action of result.actions) {
    await runAction(bot, conv, msg, tg, action);
  }

  const cost = estimateCostUsd(bot.ai_model, result.usage.prompt, result.usage.completion);
  await sb.from("ai_usage").insert({
    bot_id: bot.id,
    conversation_id: conv.id,
    model: bot.ai_model,
    prompt_tokens: result.usage.prompt,
    completion_tokens: result.usage.completion,
    cost_usd: cost,
  });
  const rpcRes = await sb.rpc("increment_bot_messages", { p_bot_id: bot.id });
  if (rpcRes.error) {
    await sb
      .from("bots")
      .update({ monthly_messages_used: bot.monthly_messages_used + 1 })
      .eq("id", bot.id);
  }
}

async function handleCallback(bot: BotRow, cb: TgCallbackQuery) {
  if (!cb.message) return;
  const token = await getBotToken(bot.id);
  const tg = new TgBot(token);

  await tg.answerCallbackQuery(cb.id).catch(() => {});

  const sb = db();
  const conv = await getOrCreateConversation(bot.id, cb.message);

  if (cb.data === "request_human") {
    await sb.from("conversations").update({ status: "waiting_human" }).eq("id", conv.id);
    await tg.sendMessage(
      cb.message.chat.id,
      "Operator chaqirildi. Tez orada javob beramiz 🙏"
    );
    if (bot.admin_chat_id) {
      await tg
        .sendMessage(
          bot.admin_chat_id,
          `🛟 Operator chaqirildi.\nMijoz: ${conv.customer_name ?? "?"} (@${
            conv.customer_username ?? "?"
          })`
        )
        .catch(() => {});
    }
    return;
  }

  if (cb.data === "restart") {
    if (bot.welcome_message) {
      const buttons = await getDefaultButtons(bot);
      await tg.sendMessage(cb.message.chat.id, bot.welcome_message, {
        reply_markup: buildKeyboard(buttons),
      });
    }
    return;
  }
}

async function runAction(
  bot: BotRow,
  conv: ConversationRow,
  msg: TgMessage,
  tg: TgBot,
  action: AiAction
) {
  const sb = db();

  if (action.type === "send") {
    await tg.sendMessage(msg.chat.id, action.text, {
      reply_markup: inlineReplies(),
    });
    await sb.from("messages").insert({
      conversation_id: conv.id,
      bot_id: bot.id,
      role: "assistant",
      content: action.text,
    });
    return;
  }

  if (action.type === "effect") {
    const eff = action.effect;
    switch (eff.type) {
      case "lead_created":
        if (bot.admin_chat_id) {
          const lines = [
            "🆕 <b>Yangi lead</b>",
            eff.name ? `Ism: ${eff.name}` : "",
            eff.phone ? `Tel: ${eff.phone}` : "",
            eff.request ? `Talab: ${eff.request}` : "",
            conv.customer_username ? `Telegram: @${conv.customer_username}` : "",
          ]
            .filter(Boolean)
            .join("\n");
          await tg.sendMessage(bot.admin_chat_id, lines).catch(() => {});
        }
        return;
      case "human_requested":
        if (bot.admin_chat_id) {
          await tg
            .sendMessage(
              bot.admin_chat_id,
              `🛟 Operator chaqirildi.\nMijoz: ${conv.customer_name ?? "?"} (@${
                conv.customer_username ?? "?"
              })\nSabab: ${eff.reason ?? "—"}`
            )
            .catch(() => {});
        }
        return;
      case "booking_created":
        if (bot.admin_chat_id) {
          await tg
            .sendMessage(
              bot.admin_chat_id,
              `📅 <b>Yangi bron</b>\nXizmat: ${eff.service}\nVaqt: ${eff.slot}\nMijoz: ${conv.customer_name ?? "?"} (@${conv.customer_username ?? "?"})`
            )
            .catch(() => {});
        }
        return;
      case "order_created":
        if (bot.admin_chat_id) {
          await tg
            .sendMessage(
              bot.admin_chat_id,
              `🛒 <b>Yangi buyurtma</b>\nID: ${eff.orderId.slice(0, 8)}\nJami: ${eff.total.toLocaleString("uz")} so'm\nMijoz: ${conv.customer_name ?? "?"} (@${conv.customer_username ?? "?"})`
            )
            .catch(() => {});
        }
        return;
      case "payment_link":
        await tg
          .sendMessage(msg.chat.id, `💳 ${eff.description}\nSumma: ${eff.amount.toLocaleString("uz")} so'm`, {
            reply_markup: {
              inline_keyboard: [[{ text: "💳 To'lash", url: eff.url }]],
            },
          })
          .catch(() => {});
        return;
    }
  }
}

async function getOrCreateConversation(
  botId: string,
  msg: TgMessage
): Promise<ConversationRow> {
  const sb = db();
  const { data: existing } = await sb
    .from("conversations")
    .select("*")
    .eq("bot_id", botId)
    .eq("tg_chat_id", msg.chat.id)
    .maybeSingle();
  if (existing) return existing as ConversationRow;

  const { data, error } = await sb
    .from("conversations")
    .insert({
      bot_id: botId,
      tg_chat_id: msg.chat.id,
      tg_user_id: msg.from?.id ?? msg.chat.id,
      customer_name:
        [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || null,
      customer_username: msg.from?.username ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ConversationRow;
}

async function getDefaultButtons(bot: BotRow): Promise<string[]> {
  if (!bot.template_id) return [];
  const { data } = await db()
    .from("bot_templates")
    .select("default_buttons")
    .eq("id", bot.template_id)
    .maybeSingle();
  let raw = data?.default_buttons ?? [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  const arr = (raw ?? []) as { text: string }[];
  return Array.isArray(arr) ? arr.map((b) => b.text) : [];
}
