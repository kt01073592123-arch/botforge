// Telegram Bot API klient + WebApp initData verification.

import crypto from "node:crypto";
import { env } from "./env";

export type TgWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
};

// initData ni Telegram BotFather token bilan tasdiqlaydi.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyInitData(initData: string): {
  ok: boolean;
  user?: TgWebAppUser;
  authDate?: number;
  reason?: string;
} {
  if (!initData) return { ok: false, reason: "initData bo‘sh" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "hash yo‘q" };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(env().TELEGRAM_BOT_TOKEN)
    .digest();
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computed !== hash) return { ok: false, reason: "hash mos kelmadi" };

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate) return { ok: false, reason: "auth_date yo‘q" };
  // 24 soatdan eski initData ni rad qilamiz
  if (Date.now() / 1000 - authDate > 86400) {
    return { ok: false, reason: "initData eskirgan" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "user yo‘q" };

  try {
    const user = JSON.parse(userRaw) as TgWebAppUser;
    return { ok: true, user, authDate };
  } catch {
    return { ok: false, reason: "user JSON xato" };
  }
}

// =====================================================
// Bot API klient (foydalanuvchining bot tokeni bilan)
// =====================================================
export class TgBot {
  constructor(private token: string) {}

  private url(method: string) {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  async call<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.url(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new TelegramApiError(data.description ?? "telegram error", data.error_code);
    }
    return data.result as T;
  }

  getMe() {
    return this.call<{
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      can_join_groups?: boolean;
      can_read_all_group_messages?: boolean;
      supports_inline_queries?: boolean;
    }>("getMe");
  }

  setWebhook(url: string, secretToken: string) {
    return this.call<boolean>("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query", "edited_message"],
      drop_pending_updates: true,
    });
  }

  deleteWebhook() {
    return this.call<boolean>("deleteWebhook", { drop_pending_updates: true });
  }

  sendMessage(
    chatId: number | string,
    text: string,
    extra: Record<string, unknown> = {}
  ) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...extra,
    });
  }

  sendChatAction(chatId: number | string, action = "typing") {
    return this.call("sendChatAction", { chat_id: chatId, action });
  }

  answerCallbackQuery(
    id: string,
    opts?: string | { text?: string; show_alert?: boolean; url?: string; cache_time?: number },
  ) {
    const params: Record<string, unknown> = { callback_query_id: id };
    if (typeof opts === "string") params.text = opts;
    else if (opts) Object.assign(params, opts);
    return this.call("answerCallbackQuery", params);
  }

  editMessageReplyMarkup(
    chatId: number | string,
    messageId: number,
    replyMarkup: Record<string, unknown> | null
  ) {
    return this.call("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    });
  }

  // Bot API 9.6: managed bot uchun token olish (faqat manager bot tokeni bilan)
  getManagedBotToken(userId: number) {
    return this.call<string>("getManagedBotToken", { user_id: userId });
  }

  replaceManagedBotToken(userId: number) {
    return this.call<string>("replaceManagedBotToken", { user_id: userId });
  }
}

export class TelegramApiError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = "TelegramApiError";
  }
}

// Telegram update tipi (kichik subset)
export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
  // Bot API 9.6: managed bot yaratilganda yoki tokeni o‘zgarganda keladi
  managed_bot?: TgManagedBotUpdated;
};

export type TgUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  can_manage_bots?: boolean;
};

export type TgManagedBotUpdated = {
  user: TgUser; // bot yaratuvchi user
  bot: TgUser; // yangi managed bot
};

export type TgManagedBotCreated = {
  bot: TgUser;
};

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string; first_name?: string; last_name?: string; username?: string };
  date: number;
  text?: string;
  caption?: string;
  contact?: { phone_number: string; first_name: string; last_name?: string; user_id?: number };
  // Voice/audio — Whisper STT uchun
  voice?: { file_id: string; duration: number; mime_type?: string; file_size?: number };
  audio?: { file_id: string; duration: number; mime_type?: string; file_size?: number };
  // Photo — Claude Vision uchun (har xil sifatdagi versiyalar massivi)
  photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
  // Bot API 9.6: chat ichida service xabar sifatida keladi
  managed_bot_created?: TgManagedBotCreated;
};

export type TgCallbackQuery = {
  id: string;
  from: { id: number; first_name: string; last_name?: string; username?: string };
  message?: TgMessage;
  data?: string;
};
