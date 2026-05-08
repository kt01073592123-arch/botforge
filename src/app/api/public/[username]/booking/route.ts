// Customer WebApp’dan bron qabul qilish.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { createBooking } from "@/lib/bookings";
import { getBotToken } from "@/lib/bots";
import { TgBot } from "@/lib/telegram";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  init_data: z.string().optional(),
  customer_name: z.string().max(100).nullable(),
  customer_phone: z.string().min(5).max(30).nullable(),
  slot_start: z.string(),
  slot_end: z.string(),
  service_name: z.string(),
  service_price: z.string().optional(),
  service_duration: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

function parseTgUser(initData: string): { id?: number; username?: string; first_name?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const u = params.get("user");
    if (!u) return null;
    return JSON.parse(u);
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `booking|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 5,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }
  if (!body.customer_phone) {
    return NextResponse.json({ error: "Telefon raqamini kiriting" }, { status: 400 });
  }

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("*")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const tgUser = body.init_data ? parseTgUser(body.init_data) : null;

  let booking;
  try {
    booking = await createBooking({
      botId: bot.id,
      customer: {
        name: body.customer_name ?? tgUser?.first_name ?? undefined,
        phone: body.customer_phone,
        tg_id: tgUser?.id,
        tg_username: tgUser?.username,
      },
      slotStart: body.slot_start,
      slotEnd: body.slot_end,
      serviceName: body.service_name,
      servicePrice: body.service_price,
      serviceDuration: body.service_duration,
      notes: body.notes ?? undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }

  // Customer profile yangilash
  if (tgUser?.id) {
    await sb.rpc("upsert_customer_profile", {
      p_bot_id: bot.id,
      p_tg_id: tgUser.id,
      p_name: body.customer_name ?? tgUser.first_name ?? null,
      p_phone: body.customer_phone,
      p_username: tgUser.username ?? null,
    });
  }

  // Admin xabari
  if (bot.admin_chat_id) {
    try {
      const token = await getBotToken(bot.id);
      const tg = new TgBot(token);
      const slotDate = new Date(body.slot_start);
      const dateStr = slotDate.toLocaleString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const lines = [
        "📅 <b>Yangi bron</b>",
        "",
        `Xizmat: <b>${escapeHtml(body.service_name)}</b>`,
        `Sana/vaqt: <b>${escapeHtml(dateStr)}</b>`,
        body.service_duration ? `Davom: ${escapeHtml(body.service_duration)}` : "",
        "",
        `Mijoz: ${escapeHtml(body.customer_name ?? "—")}`,
        `Tel: <code>${escapeHtml(body.customer_phone)}</code>`,
        tgUser?.username ? `Telegram: @${escapeHtml(tgUser.username)}` : "",
        body.notes ? `\nIzoh: ${escapeHtml(body.notes)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      await tg.sendMessage(bot.admin_chat_id, lines);
    } catch {
      // Admin xabari xato bo‘lsa ham bron qabul qilingan
    }
  }

  return NextResponse.json({ ok: true, booking_id: booking.id });
}
