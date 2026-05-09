// Telegram update'ni qayta ishlovchi runtime - bot uchun universal.

import { db } from "./supabase/server";
import { TgBot } from "./telegram";
import { getBotToken } from "./bots";
import { generateReply, estimateCostUsd, type AiAction } from "./ai/engine";
import { rateLimit } from "./ratelimit";
import { alertOwner } from "./alerts";
import { touchProfile } from "./customer_memory";
import { transcribeVoice, describePhoto } from "./ai/multimodal";
import { env } from "./env";
import type { BotRow, ConversationRow, MessageRow } from "./supabase/types";
import type { TgUpdate, TgMessage, TgCallbackQuery } from "./telegram";

// Yangi format: tugma {text, web_app?, url?} bo'lishi mumkin.
// Eski format: faqat string. Ikkalasi ham qo'llab-quvvatlanadi.
type BotButton = string | { text: string; web_app?: boolean; url?: string };

// Telegram reply keyboard tugmalarini quradi. Agar tugma web_app:true bo'lsa,
// haqiqiy Mini App (web_app: {url}) sifatida chiqadi - bot ichida ochiladi.
function buildKeyboard(buttons: BotButton[], bot?: BotRow) {
  if (buttons.length === 0) return undefined;
  const baseUrl = env().NEXT_PUBLIC_APP_URL;
  const defaultMiniAppUrl = bot?.tg_username
    ? `${baseUrl}/c/${bot.tg_username}`
    : null;

  const rows: {
    text: string;
    web_app?: { url: string };
    request_contact?: boolean;
  }[][] = [];
  for (const b of buttons) {
    if (typeof b === "string") {
      rows.push([{ text: b }]);
      continue;
    }
    if (b.web_app) {
      const url = b.url
        ? b.url.startsWith("http")
          ? b.url
          : `${baseUrl}${b.url.startsWith("/") ? "" : "/"}${b.url}`
        : defaultMiniAppUrl;
      if (url) {
        rows.push([{ text: b.text, web_app: { url } }]);
      } else {
        rows.push([{ text: b.text }]);
      }
    } else {
      rows.push([{ text: b.text }]);
    }
  }
  rows.push([{ text: "📞 Telefon raqamimni yuborish", request_contact: true }]);
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

  if (text === "/start") {
    if (bot.welcome_message) {
      const buttons = await getDefaultButtons(bot);
      await tg.sendMessage(msg.chat.id, bot.welcome_message, {
        reply_markup: buildKeyboard(buttons, bot),
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

  if (isVoice && !text) {
    try {
      const fileId = msg.voice?.file_id ?? msg.audio?.file_id;
      if (fileId) {
        const transcript = await transcribeVoice(token, fileId);
        text = transcript || "[Ovozli xabar - matnga aylantirib bo'lmadi]";
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
      "Operator chaqirildi. Tez orada javob beramiz 🙏",
    );
    if (bot.admin_chat_id) {
      await tg
        .sendMessage(
          bot.admin_chat_id,
          `🛟 Operator chaqirildi.\nMijoz: ${conv.customer_name ?? "?"} (@${
            conv.customer_username ?? "?"
          })`,
        )
        .catch(() => {});
    }
    return;
  }

  if (cb.data === "restart") {
    if (bot.welcome_message) {
      const buttons = await getDefaultButtons(bot);
      await tg.sendMessage(cb.message.chat.id, bot.welcome_message, {
        reply_markup: buildKeyboard(buttons, bot),
      });
    }
    return;
  }

  // Order lifecycle: order_accept_<id> / order_ship_<id> / order_deliver_<id> / order_cancel_<id>
  // BeautyShop pattern - admin inline tugmalardan status o'zgartiradi.
  const orderMatch = cb.data?.match(/^order_(accept|ship|deliver|cancel)_(.+)$/);
  if (orderMatch) {
    return handleOrderCallback(bot, cb, tg, orderMatch[1] as OrderAction, orderMatch[2]);
  }

  // Review rating: order_rate_<orderId>_<1-5>
  const rateMatch = cb.data?.match(/^order_rate_([^_]+)_([1-5])$/);
  if (rateMatch) {
    return handleRatingCallback(bot, cb, tg, rateMatch[1], parseInt(rateMatch[2], 10));
  }
}

type OrderAction = "accept" | "ship" | "deliver" | "cancel";

async function handleOrderCallback(
  bot: BotRow,
  cb: TgCallbackQuery,
  tg: TgBot,
  action: OrderAction,
  orderId: string,
) {
  if (!cb.message) return;
  const sb = db();

  const { data: order } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("bot_id", bot.id)
    .maybeSingle();

  if (!order) {
    await tg.answerCallbackQuery(cb.id, { text: "Buyurtma topilmadi" }).catch(() => {});
    return;
  }

  // Status o'tishi qoidalari (BeautyShop pattern)
  const transitions: Record<OrderAction, { from: string[]; to: string }> = {
    accept: { from: ["pending"], to: "confirmed" },
    ship: { from: ["confirmed"], to: "in_progress" },
    deliver: { from: ["confirmed", "in_progress"], to: "completed" },
    cancel: { from: ["pending", "confirmed", "in_progress"], to: "cancelled" },
  };
  const t = transitions[action];
  if (!t.from.includes((order as { status: string }).status)) {
    await tg
      .answerCallbackQuery(cb.id, { text: "Bu o'tish mumkin emas" })
      .catch(() => {});
    return;
  }

  await sb
    .from("orders")
    .update({
      status: t.to,
      ...(t.to === "completed" ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  const statusUz: Record<string, string> = {
    pending: "Kutilmoqda ⏳",
    confirmed: "Qabul qilindi ✅",
    in_progress: "Yo'lga chiqdi 🚚",
    completed: "Yetkazildi 📦",
    cancelled: "Bekor qilindi ❌",
  };

  // Admin xabar matnini yangilash + tugmalarni keyingi statusga moslash
  const displayId = `ORD-${orderId.slice(-6).toUpperCase()}`;
  const newKeyboard: { text: string; callback_data?: string; url?: string }[][] = [];
  if (t.to === "confirmed") {
    newKeyboard.push([
      { text: "🚚 Jo'natildi", callback_data: `order_ship_${orderId}` },
      { text: "📦 Yetkazildi", callback_data: `order_deliver_${orderId}` },
    ]);
    newKeyboard.push([{ text: "❌ Bekor", callback_data: `order_cancel_${orderId}` }]);
  } else if (t.to === "in_progress") {
    newKeyboard.push([
      { text: "📦 Yetkazildi", callback_data: `order_deliver_${orderId}` },
    ]);
  }
  const orderRow = order as { customer_tg_id: number | null; customer_tg_username: string | null };
  if (orderRow.customer_tg_id) {
    newKeyboard.push([
      { text: "💬 Mijozga yozish", url: `tg://user?id=${orderRow.customer_tg_id}` },
    ]);
  }

  try {
    await tg.call("editMessageText", {
      chat_id: cb.message.chat.id,
      message_id: cb.message.message_id,
      text:
        `🛒 Buyurtma\n🆔 ${displayId}\n📊 Status: <b>${statusUz[t.to]}</b>\n\n` +
        ((cb.message as { text?: string }).text ?? "")
          .split("\n")
          .filter(
            (l) =>
              !l.startsWith("📊 Status:") &&
              !l.startsWith("🛒") &&
              !l.startsWith("🆔") &&
              l.trim() !== "",
          )
          .join("\n"),
      parse_mode: "HTML",
      reply_markup: newKeyboard.length > 0 ? { inline_keyboard: newKeyboard } : undefined,
    });
  } catch {}

  // Mijozga xabar (status yangilangan)
  if (orderRow.customer_tg_id) {
    await tg
      .sendMessage(
        orderRow.customer_tg_id,
        `Sizning buyurtmangiz (${displayId}) holati o'zgardi:\n\n<b>${statusUz[t.to]}</b>`,
      )
      .catch(() => {});
  }

  // Yetkazilganda: review so'rash + cashback (referral bonus)
  if (t.to === "completed" && orderRow.customer_tg_id) {
    // Cashback: agar referral'da yozilgan bo'lsa
    try {
      const total = (order as { total_uzs: number }).total_uzs ?? 0;
      const cashback = Math.floor(total * 0.02);
      const { data: ref } = await sb
        .from("referrals")
        .select("*")
        .eq("bot_id", bot.id)
        .eq("referred_tg_id", orderRow.customer_tg_id)
        .eq("bonus_granted", false)
        .maybeSingle();
      if (ref) {
        const refRow = ref as { id: string; referrer_tg_id: number };
        await sb
          .from("referrals")
          .update({ bonus_granted: true, bonus_uzs: cashback })
          .eq("id", refRow.id);
        // Referrer'ga loyalty_points ga qo'shish
        await sb.rpc("upsert_customer_profile", {
          p_bot_id: bot.id,
          p_tg_id: refRow.referrer_tg_id,
          p_name: null,
          p_phone: null,
          p_username: null,
        });
        await sb
          .from("customer_profiles")
          .update({ loyalty_points: cashback })
          .eq("bot_id", bot.id)
          .eq("tg_user_id", refRow.referrer_tg_id);
        await tg
          .sendMessage(
            refRow.referrer_tg_id,
            `🎉 Tabriklaymiz! Siz taklif qilgan mijoz xarid qildi va sizga ${cashback.toLocaleString("uz-UZ")} so'm keshbek tushdi!`,
          )
          .catch(() => {});
      }
    } catch (e) {
      console.error("[order_deliver] cashback error", e);
    }

    // Review so'rash
    await tg
      .sendMessage(
        orderRow.customer_tg_id,
        "Xarid qilingan mahsulotlardan mamnunmisiz?\nIltimos, do'konimizga baho bering:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "1⭐", callback_data: `order_rate_${orderId}_1` },
                { text: "2⭐", callback_data: `order_rate_${orderId}_2` },
                { text: "3⭐", callback_data: `order_rate_${orderId}_3` },
              ],
              [
                { text: "4⭐", callback_data: `order_rate_${orderId}_4` },
                { text: "5⭐", callback_data: `order_rate_${orderId}_5` },
              ],
            ],
          },
        },
      )
      .catch(() => {});
  }

  await tg.answerCallbackQuery(cb.id, { text: `Status: ${statusUz[t.to]}` }).catch(() => {});
}

async function handleRatingCallback(
  bot: BotRow,
  cb: TgCallbackQuery,
  tg: TgBot,
  orderId: string,
  rating: number,
) {
  if (!cb.message) return;
  const sb = db();
  const tgUserId = cb.from.id;
  const customerName =
    [cb.from.first_name, cb.from.last_name].filter(Boolean).join(" ") || null;

  // Reviews jadvaliga yozamiz (yoki yangilaymiz - order_id unique emas)
  await sb.from("reviews").insert({
    bot_id: bot.id,
    customer_tg_id: tgUserId,
    customer_name: customerName,
    rating,
    order_id: orderId,
    is_published: true,
  });

  await tg
    .call("editMessageText", {
      chat_id: cb.message.chat.id,
      message_id: cb.message.message_id,
      text: `Siz ${rating} yulduz qo'ydingiz! Rahmat 🌸\n\nIstasangiz qisqacha sharh yozib yuboring (matn ixtiyoriy).`,
    })
    .catch(() => {});

  await tg
    .answerCallbackQuery(cb.id, { text: "Baho qabul qilindi!" })
    .catch(() => {});
}

async function runAction(
  bot: BotRow,
  conv: ConversationRow,
  msg: TgMessage,
  tg: TgBot,
  action: AiAction,
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
              })\nSabab: ${eff.reason ?? "—"}`,
            )
            .catch(() => {});
        }
        return;
      case "booking_created":
        if (bot.admin_chat_id) {
          await tg
            .sendMessage(
              bot.admin_chat_id,
              `📅 <b>Yangi bron</b>\nXizmat: ${eff.service}\nVaqt: ${eff.slot}\nMijoz: ${conv.customer_name ?? "?"} (@${conv.customer_username ?? "?"})`,
            )
            .catch(() => {});
        }
        return;
      case "order_created":
        if (bot.admin_chat_id) {
          await tg
            .sendMessage(
              bot.admin_chat_id,
              `🛒 <b>Yangi buyurtma</b>\nID: ${eff.orderId.slice(0, 8)}\nJami: ${eff.total.toLocaleString("uz")} so'm\nMijoz: ${conv.customer_name ?? "?"} (@${conv.customer_username ?? "?"})`,
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
  msg: TgMessage,
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

// Bot uchun aktual tugmalar ro'yxati. Avval bot_data.custom_buttons (AI generatsiya
// yoki egasi tahriri), so'ng bot_templates.default_buttons (sklet pack).
async function getDefaultButtons(bot: BotRow): Promise<BotButton[]> {
  const sb = db();
  try {
    const { data: bd } = await sb
      .from("bot_data")
      .select("custom_buttons")
      .eq("bot_id", bot.id)
      .maybeSingle();
    let cb = (bd as { custom_buttons?: unknown } | null)?.custom_buttons;
    if (typeof cb === "string") {
      try { cb = JSON.parse(cb); } catch {}
    }
    if (Array.isArray(cb) && cb.length > 0) {
      return cb as BotButton[];
    }
  } catch {}

  if (!bot.template_id) return [];
  const { data } = await sb
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
  const arr = (raw ?? []) as BotButton[];
  return Array.isArray(arr) ? arr : [];
}
