// Telegram update ni qayta ishlovchi runtime — bot uchun universal. Webhook handler shu yerni chaqiradi.

import { db } from "./supabase/server";
import { TgBot } from "./telegram";
import { getBotToken } from "./bots";
import { generateReply, estimateCostUsd, type AiAction } from "./ai/engine";
import { rateLimit } from "./ratelimit";
import { alertOwner } from "./alerts";
import type { BotRow, ConversationRow, MessageRow } from "./supabase/types";
import type { TgUpdate, TgMessage, TgCallbackQuery } from "./telegram";

// Reply keyboard: oddiy tugma ro‘yxati. Inline keyboard: callback_data bilan.
function buildKeyboard(buttons: string[]) {
  if (buttons.length === 0) return undefined;
  // Reply keyboard + contact share tugma — Beauty/Lead bot uchun foydali
  const rows = [
    ...buttons.map((t) => [{ text: t }]),
    [{ text: "📞 Telefon raqamimni yuborish", request_contact: true }],
  ];
  return { keyboard: rows, resize_keyboard: true };
}

// Inline tugmalar — “Telefon kutib turing” yoki “Bron tasdiqlash” kabi tezkor amallar
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
  const text = (msg.text ?? "").trim();
  if (!text && !msg.contact) return;

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

  // /start — welcome + keyboard
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

  // Contact — telefon raqami
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
    // Mijozga: operatorga uzatildi
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

  // Hammavaqt javob qaytarish kerak — Telegram clientda «yuklanmoqda» yo‘qolishi uchun
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
  switch (action.type) {
    case "send":
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
    case "save_lead":
      await sb.from("leads").insert({
        bot_id: bot.id,
        conversation_id: conv.id,
        name: action.name ?? conv.customer_name,
        phone: action.phone ?? conv.customer_phone,
        request: action.request,
      });
      if (bot.admin_chat_id) {
        const lines = [
          "🆕 <b>Yangi lead</b>",
          action.name ? `Ism: ${action.name}` : "",
          action.phone ? `Tel: ${action.phone}` : "",
          action.request ? `Talab: ${action.request}` : "",
          conv.customer_username ? `Telegram: @${conv.customer_username}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        await tg.sendMessage(bot.admin_chat_id, lines).catch(() => {});
      }
      return;
    case "request_human":
      await sb.from("conversations").update({ status: "waiting_human" }).eq("id", conv.id);
      if (bot.admin_chat_id) {
        await tg
          .sendMessage(
            bot.admin_chat_id,
            `🛟 Operator chaqirildi.\nMijoz: ${conv.customer_name ?? "?"} (@${conv.customer_username ?? "?"})\nSabab: ${action.reason ?? "—"}`
          )
          .catch(() => {});
      }
      return;
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
  const arr = (data?.default_buttons ?? []) as { text: string }[];
  return arr.map((b) => b.text);
}
