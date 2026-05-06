// Loyiha bo‘ylab DB tiplari (qo‘lda yozilgan, soddalashtirilgan).
// Production’da `supabase gen types` orqali avtomatik chiqarish maslahat beriladi.

export type AppUser = {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  photo_url: string | null;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string;
};

export type BotStatus = "draft" | "active" | "paused" | "error";

export type BotRow = {
  id: string;
  owner_id: string;
  template_id: string | null;
  name: string;
  business_name: string | null;
  business_type: string | null;
  language: string;
  status: BotStatus;
  tg_bot_id: number | null;
  tg_username: string | null;
  tg_first_name: string | null;
  webhook_secret: string | null;
  ai_model: string;
  system_prompt: string | null;
  welcome_message: string | null;
  admin_chat_id: number | null;
  monthly_message_limit: number;
  monthly_messages_used: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BotTemplateRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  default_system_prompt: string;
  default_welcome: string | null;
  default_buttons: { text: string }[];
  is_active: boolean;
};

export type BotData = {
  bot_id: string;
  services: { name: string; price: string; duration?: string }[];
  working_hours: Record<string, [number, number] | null>;
  contacts: { phone?: string; address?: string; instagram?: string };
  faq: { q: string; a: string }[];
  custom_fields: Record<string, unknown>;
};

export type ConversationRow = {
  id: string;
  bot_id: string;
  tg_chat_id: number;
  tg_user_id: number;
  customer_name: string | null;
  customer_username: string | null;
  customer_phone: string | null;
  status: "open" | "waiting_human" | "closed";
  message_count: number;
  last_message_at: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  bot_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tg_message_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LeadRow = {
  id: string;
  bot_id: string;
  conversation_id: string | null;
  name: string | null;
  phone: string | null;
  request: string | null;
  status: "new" | "contacted" | "converted" | "lost";
  notes: string | null;
  created_at: string;
};
