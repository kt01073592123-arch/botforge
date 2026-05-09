// AI engine tool definitions + tool executors.
// Bu fayl AI ga "qo'l-oyoq" beradi: u faqat gapirish emas, real harakat qila oladi.
//
// Har bir tool 2 qismdan iborat:
//   1) `definition` — Anthropic'ga yuboriladigan schema (LLM ko'radi)
//   2) `execute()` — server tomonida bajariladi, natija LLM'ga qaytadi
//
// Tool natijasi user'ga ko'rinmaydi — LLM keyingi turda foydalanadi va matn yozadi.

import type Anthropic from "@anthropic-ai/sdk";
import { db } from "../supabase/server";
import { searchKnowledge } from "../kb";
import type { BotRow, BotData, ConversationRow } from "../supabase/types";

export type ToolContext = {
  bot: BotRow;
  conv: ConversationRow;
  bd: BotData | null;
};

export type ToolResult = {
  // LLM ga keyingi turga input
  content: string;
  // Side-effects ro'yxati — runtime ulardan xabar yuboradi yoki DB ga yozadi
  effects?: ToolEffect[];
};

export type ToolEffect =
  | { type: "lead_created"; leadId: string; name?: string; phone?: string; request?: string }
  | { type: "human_requested"; reason?: string }
  | { type: "booking_created"; bookingId: string; service: string; slot: string }
  | { type: "order_created"; orderId: string; total: number }
  | { type: "payment_link"; url: string; amount: number; description: string };

// ════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — Anthropic'ga yuboriladi
// ════════════════════════════════════════════════════════════
export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "save_lead",
    description:
      "Mijoz aloqa qoldirgan bo'lsa (ism, telefon, aniq talab) shuni chaqir. " +
      "Mijoz sotuv funnelida 'qiziqdi' bosqichida bo'lsa.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Mijoz ismi" },
        phone: { type: "string", description: "Telefon raqami" },
        request: { type: "string", description: "Mijoz talabi/savoli" },
      },
    },
  },
  {
    name: "request_human",
    description:
      "Mijoz operator/admin bilan gaplashishni so'rasa, yoki sen javob bera olmasang.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Nega operator kerak" },
      },
    },
  },
  {
    name: "search_knowledge",
    description:
      "Bilim bazasidan (knowledge base) javob qidir. Mijoz sen bilmagan biror narsa " +
      "haqida so'rasa shuni chaqir. Natija topilmasa request_human chaqir.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Qidiruv so'rovi (mijoz savoli)" },
      },
      required: ["query"],
    },
  },
  {
    name: "check_availability",
    description:
      "Booking uchun bo'sh slotlarni qaytaradi. Mijoz 'qachon bo'sh?' yoki 'ertaga vaqt bormi?' " +
      "deb so'rasa shuni chaqir. Natija JSON: bo'sh slotlar ro'yxati.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "ISO sana (YYYY-MM-DD). Aniq bo'lmasa bo'sh qoldir — bugun + 7 kun qaytadi.",
        },
        service: { type: "string", description: "Xizmat nomi (xizmat-spesifik bo'sh slotlar)" },
      },
    },
  },
  {
    name: "book_appointment",
    description:
      "Mijozga bron qilib beradi. Slot va xizmat aniq bo'lsa chaqir. " +
      "Avval check_availability bilan bo'sh slot borligini tekshir.",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", description: "Xizmat nomi (services'dan)" },
        slot_start: {
          type: "string",
          description: "Bron boshlanish vaqti, ISO 8601 (masalan 2026-05-12T14:00:00Z)",
        },
        customer_name: { type: "string", description: "Mijoz ismi" },
        customer_phone: { type: "string", description: "Mijoz telefoni" },
        notes: { type: "string", description: "Qo'shimcha eslatma (ixtiyoriy)" },
      },
      required: ["service_name", "slot_start"],
    },
  },
  {
    name: "create_order",
    description:
      "Buyurtma yarat. Mijoz mahsulotlar tanlab 'olaman' deganda chaqir. " +
      "items'da har biri {name, qty, price} bo'lishi kerak.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              qty: { type: "number" },
              price: { type: "number" },
            },
            required: ["name", "qty", "price"],
          },
        },
        customer_name: { type: "string" },
        customer_phone: { type: "string" },
        note: { type: "string" },
      },
      required: ["items"],
    },
  },
  {
    name: "lookup_order",
    description:
      "Mavjud buyurtma holatini tekshir. Mijoz 'mening buyurtmam qayerda?' deganda chaqir. " +
      "Order ID yoki telefon bo'yicha qidiradi.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "Buyurtma ID (UUID, ixtiyoriy)" },
        phone: { type: "string", description: "Mijoz telefoni" },
      },
    },
  },
  {
    name: "send_payment_link",
    description:
      "Click/Payme to'lov linkini yarat va mijozga yuboriladigan matnni qaytar. " +
      "Mijoz to'lashga tayyor bo'lganda chaqir.",
    input_schema: {
      type: "object",
      properties: {
        amount_uzs: { type: "number", description: "Summa (so'm)" },
        description: { type: "string", description: "Nima uchun to'lov" },
        order_id: { type: "string", description: "Buyurtma ID (ixtiyoriy)" },
      },
      required: ["amount_uzs", "description"],
    },
  },
];

// ════════════════════════════════════════════════════════════
// TOOL EXECUTORS — server tomon
// ════════════════════════════════════════════════════════════
type Input = Record<string, unknown>;

export async function executeTool(
  name: string,
  input: Input,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (name) {
    case "save_lead":
      return execSaveLead(input, ctx);
    case "request_human":
      return execRequestHuman(input, ctx);
    case "search_knowledge":
      return execSearchKnowledge(input, ctx);
    case "check_availability":
      return execCheckAvailability(input, ctx);
    case "book_appointment":
      return execBookAppointment(input, ctx);
    case "create_order":
      return execCreateOrder(input, ctx);
    case "lookup_order":
      return execLookupOrder(input, ctx);
    case "send_payment_link":
      return execSendPaymentLink(input, ctx);
    default:
      return { content: `Tool '${name}' topilmadi.` };
  }
}

async function execSaveLead(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const sb = db();
  const name = (input.name as string) ?? ctx.conv.customer_name ?? null;
  const phone = (input.phone as string) ?? ctx.conv.customer_phone ?? null;
  const request = (input.request as string) ?? null;

  const { data, error } = await sb
    .from("leads")
    .insert({
      bot_id: ctx.bot.id,
      conversation_id: ctx.conv.id,
      name,
      phone,
      request,
    })
    .select("id")
    .single();
  if (error) return { content: `Xato: ${error.message}` };

  return {
    content: "Lead muvaffaqiyatli saqlandi. Adminga xabar yuborildi.",
    effects: [
      { type: "lead_created", leadId: data.id, name: name ?? undefined, phone: phone ?? undefined, request: request ?? undefined },
    ],
  };
}

async function execRequestHuman(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const sb = db();
  await sb.from("conversations").update({ status: "waiting_human" }).eq("id", ctx.conv.id);
  return {
    content: "Operator chaqirildi. Mijozga 'tez orada javob beramiz' deb javob ber.",
    effects: [{ type: "human_requested", reason: input.reason as string | undefined }],
  };
}

async function execSearchKnowledge(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const query = String(input.query ?? "");
  const hits = await searchKnowledge({ botId: ctx.bot.id, query, limit: 3 });
  if (hits.length === 0) {
    return { content: "Knowledge base'da javob topilmadi. Mijozga 'aniqlashtirib aytaman' deb yozib, request_human chaqir." };
  }
  return {
    content:
      "Knowledge base natijalari:\n\n" +
      hits.map((h, i) => `[${i + 1}] (${(h.similarity * 100).toFixed(0)}%) ${h.content}`).join("\n\n") +
      "\n\nShu ma'lumotlar asosida mijozga javob ber.",
  };
}

async function execCheckAvailability(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const sb = db();
  const dateStr = (input.date as string) || new Date().toISOString().slice(0, 10);
  const service = (input.service as string) || "";

  const dayStart = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 7);

  const { data: booked } = await sb
    .from("bookings")
    .select("slot_start, slot_end, service_name")
    .eq("bot_id", ctx.bot.id)
    .gte("slot_start", dayStart.toISOString())
    .lte("slot_start", dayEnd.toISOString())
    .in("status", ["pending", "confirmed", "completed"]);

  // Ish vaqtidan kelib chiqib, slot generatsiya (default 09:00–18:00, 30 daq)
  const wh = (ctx.bd?.working_hours ?? {}) as Record<string, [number, number] | null>;
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const slots: string[] = [];

  for (let d = 0; d < 7; d++) {
    const date = new Date(dayStart);
    date.setUTCDate(date.getUTCDate() + d);
    const dayKey = dayKeys[date.getUTCDay()];
    const hours = wh[dayKey] ?? [9, 18];
    if (!hours) continue;
    for (let h = hours[0]; h < hours[1]; h++) {
      for (const m of [0, 30]) {
        const slot = new Date(date);
        slot.setUTCHours(h, m, 0, 0);
        if (slot < new Date()) continue;
        const isoSlot = slot.toISOString();
        const taken = (booked ?? []).some((b) => b.slot_start === isoSlot);
        if (!taken) slots.push(isoSlot);
        if (slots.length >= 12) break;
      }
      if (slots.length >= 12) break;
    }
    if (slots.length >= 12) break;
  }

  if (slots.length === 0) {
    return { content: `${dateStr} dan keyingi 7 kun ichida bo'sh slot yo'q.` };
  }
  return {
    content:
      `Bo'sh slotlar (${service || "umumiy"}):\n` +
      slots.slice(0, 8).map((s) => `- ${formatSlot(s)}`).join("\n") +
      `\n\nMijozga 2-3 ta yaqin variant taklif qil va tanlasa book_appointment chaqir.`,
  };
}

async function execBookAppointment(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const sb = db();
  const slotStart = String(input.slot_start ?? "");
  const serviceName = String(input.service_name ?? "");
  if (!slotStart || !serviceName) {
    return { content: "slot_start va service_name kerak." };
  }

  const slot = new Date(slotStart);
  if (isNaN(slot.getTime())) return { content: "slot_start ISO format emas." };
  if (slot < new Date()) return { content: "O'tib ketgan vaqtga bron qilib bo'lmaydi." };

  // Slot to'qnashuvi tekshiruvi
  const { data: clash } = await sb
    .from("bookings")
    .select("id")
    .eq("bot_id", ctx.bot.id)
    .eq("slot_start", slot.toISOString())
    .not("status", "in", "(cancelled,no_show)")
    .maybeSingle();
  if (clash) return { content: "Bu slot band. Boshqa vaqt taklif qil." };

  // Xizmat narxi
  const services = (ctx.bd?.services ?? []) as Array<{ name: string; price: string; duration?: string }>;
  const svc = services.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
  const durationMin = parseDurationMin(svc?.duration) ?? 30;

  const slotEnd = new Date(slot.getTime() + durationMin * 60 * 1000);

  const { data, error } = await sb
    .from("bookings")
    .insert({
      bot_id: ctx.bot.id,
      conversation_id: ctx.conv.id,
      customer_name: (input.customer_name as string) ?? ctx.conv.customer_name,
      customer_phone: (input.customer_phone as string) ?? ctx.conv.customer_phone,
      customer_tg_id: ctx.conv.tg_user_id,
      customer_tg_username: ctx.conv.customer_username,
      slot_start: slot.toISOString(),
      slot_end: slotEnd.toISOString(),
      service_name: serviceName,
      service_price: svc?.price,
      service_duration: svc?.duration,
      notes: (input.notes as string) ?? null,
    })
    .select("id")
    .single();
  if (error) return { content: `Bron yaratilmadi: ${error.message}` };

  return {
    content: `Bron yaratildi. ID: ${data.id}. Vaqt: ${formatSlot(slot.toISOString())}. Mijozga tasdiq xabari yubor.`,
    effects: [
      { type: "booking_created", bookingId: data.id, service: serviceName, slot: formatSlot(slot.toISOString()) },
    ],
  };
}

async function execCreateOrder(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const sb = db();
  const items = (input.items as Array<{ name: string; qty: number; price: number }>) ?? [];
  if (items.length === 0) return { content: "items bo'sh." };

  const total = items.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);

  const { data, error } = await sb
    .from("orders")
    .insert({
      bot_id: ctx.bot.id,
      conversation_id: ctx.conv.id,
      customer_name: (input.customer_name as string) ?? ctx.conv.customer_name,
      customer_phone: (input.customer_phone as string) ?? ctx.conv.customer_phone,
      customer_tg_id: ctx.conv.tg_user_id,
      customer_tg_username: ctx.conv.customer_username,
      items,
      total_uzs: total,
      note: (input.note as string) ?? null,
    })
    .select("id")
    .single();
  if (error) return { content: `Buyurtma yaratilmadi: ${error.message}` };

  return {
    content: `Buyurtma yaratildi. ID: ${data.id}. Jami: ${total.toLocaleString("uz")} so'm. Mijozga tasdiqlat va to'lov linkini yubor.`,
    effects: [{ type: "order_created", orderId: data.id, total }],
  };
}

async function execLookupOrder(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const sb = db();
  const orderId = (input.order_id as string) ?? "";
  const phone = (input.phone as string) ?? ctx.conv.customer_phone ?? "";

  let q = sb
    .from("orders")
    .select("id, status, total_uzs, paid, created_at, items, note")
    .eq("bot_id", ctx.bot.id)
    .order("created_at", { ascending: false })
    .limit(3);
  if (orderId) q = q.eq("id", orderId);
  else if (phone) q = q.eq("customer_phone", phone);
  else q = q.eq("customer_tg_id", ctx.conv.tg_user_id);

  const { data } = await q;
  if (!data || data.length === 0) return { content: "Buyurtma topilmadi." };

  return {
    content:
      "Topilgan buyurtmalar:\n" +
      data
        .map(
          (o) =>
            `- ${o.id.slice(0, 8)} | ${o.status} | ${o.total_uzs.toLocaleString("uz")} so'm | ${o.paid ? "✅ to'langan" : "⏳ to'lanmagan"}`
        )
        .join("\n"),
  };
}

async function execSendPaymentLink(input: Input, ctx: ToolContext): Promise<ToolResult> {
  const amount = Number(input.amount_uzs ?? 0);
  const description = String(input.description ?? "To'lov");
  const orderId = (input.order_id as string) ?? "";
  if (amount <= 0) return { content: "amount_uzs > 0 bo'lishi kerak." };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // Public checkout endpoint — Click/Payme ni tanlash mijoz tomondan
  const url = `${baseUrl}/c/pay?bot=${ctx.bot.id}&amount=${amount}&desc=${encodeURIComponent(description)}${orderId ? `&order=${orderId}` : ""}`;

  return {
    content:
      `To'lov linki tayyor: ${url}\n` +
      `Summa: ${amount.toLocaleString("uz")} so'm\n` +
      `Mijozga inline button bilan yubor: matni "💳 ${description} — ${amount.toLocaleString("uz")} so'm".`,
    effects: [{ type: "payment_link", url, amount, description }],
  };
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

function parseDurationMin(d?: string): number | null {
  if (!d) return null;
  const m = d.match(/(\d+)\s*(daq|min|m|soat|h)?/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = (m[2] ?? "min").toLowerCase();
  if (unit.startsWith("s") || unit === "h") return n * 60;
  return n;
}
