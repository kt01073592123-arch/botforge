// Customer WebApp’dan buyurtma qabul qilish.
// initData verify qilinmaydi (mijozlar har xil bot’dan kelishlari mumkin),
// lekin rate-limit IP bo‘yicha qattiq.
// Buyurtma:
//   1. lead sifatida bot’ning leads jadvaliga yoziladi
//   2. admin Telegram’ga xabar yuboriladi (agar admin_chat_id bor bo‘lsa)

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { getBotToken } from "@/lib/bots";
import { TgBot } from "@/lib/telegram";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  init_data: z.string().optional(),
  customer_name: z.string().max(100).nullable(),
  customer_phone: z.string().min(5).max(30).nullable(),
  note: z.string().max(2000).nullable(),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.string(),
        qty: z.number().int().positive(),
      })
    )
    .min(1)
    .max(50),
  total_uzs: z.number().int().nonnegative(),
  // Promo kod (Mini App'dan) — server qayta tekshiradi
  promo_code: z.string().max(40).optional(),
  subtotal_uzs: z.number().int().nonnegative().optional(),
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c
  );
}

// Telegram WebApp initData’dan user’ni olish (best-effort, ishonchsiz)
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

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `order|${clientIp(req)}`,
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

  // Buyurtma matni admin uchun
  const itemLines = body.items.map(
    (it) => `• ${it.name} × ${it.qty} = ${it.price}`
  );
  const requestText = [
    "🛒 BUYURTMA",
    "",
    ...itemLines,
    "",
    `JAMI: ${body.total_uzs.toLocaleString("uz-UZ")} so‘m`,
    "",
    body.note ? `Izoh: ${body.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Conversation/lead bog‘lash uchun: WebApp orqali kelgan mijozlar uchun
  // alohida conversation yaratamiz (bot chatdagi suhbatga tegmaymiz)
  let convId: string | null = null;
  if (tgUser?.id) {
    const { data: existingConv } = await sb
      .from("conversations")
      .select("id")
      .eq("bot_id", bot.id)
      .eq("tg_chat_id", tgUser.id)
      .maybeSingle();
    if (existingConv) {
      convId = existingConv.id as string;
    } else {
      const { data: newConv } = await sb
        .from("conversations")
        .insert({
          bot_id: bot.id,
          tg_chat_id: tgUser.id,
          tg_user_id: tgUser.id,
          customer_name: body.customer_name ?? tgUser.first_name ?? null,
          customer_username: tgUser.username ?? null,
          customer_phone: body.customer_phone,
        })
        .select("id")
        .single();
      convId = (newConv?.id as string) ?? null;
    }
  }

  // Promo kod tekshirish (server-side double-check) — agar kiritilgan bo'lsa
  let promoDiscount = 0;
  let promoCodeId: string | null = null;
  let promoFinalTotal = body.total_uzs;
  if (body.promo_code) {
    try {
      const subtotal = body.subtotal_uzs ?? body.total_uzs;
      const validateResult = (await import("@/lib/db")).sql();
      const r = (await validateResult`
        select public.validate_promo_code(
          ${bot.id}::uuid,
          ${body.promo_code},
          ${subtotal}::int,
          ${tgUser?.id ?? null}::bigint
        ) as r
      `) as Array<{ r: { valid: boolean; discount_uzs?: number; code_id?: string } }>;
      const v = r[0]?.r;
      if (v?.valid && v.code_id && v.discount_uzs) {
        promoCodeId = v.code_id;
        promoDiscount = v.discount_uzs;
        // Agar Mini App total_uzs noto'g'ri bo'lsa server hisoblagan total ishlatamiz
        promoFinalTotal = Math.max(0, subtotal - v.discount_uzs);
      }
    } catch {
      // Promo invalid bo'lsa buyurtma davom etadi (chegirma berilmaydi)
    }
  }

  // Order yaratamiz (yangi v4 — order lifecycle)
  const { data: orderRow } = await sb
    .from("orders")
    .insert({
      bot_id: bot.id,
      conversation_id: convId,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_tg_id: tgUser?.id ?? null,
      customer_tg_username: tgUser?.username ?? null,
      items: body.items,
      total_uzs: promoFinalTotal,
      note: body.note,
    })
    .select("id")
    .single();
  const orderId = (orderRow?.id as string | undefined) ?? null;

  // Promo kod ishlatilishini yozish (agar valid bo'lsa)
  if (promoCodeId && orderId && promoDiscount > 0) {
    try {
      const dbSql = (await import("@/lib/db")).sql();
      await dbSql`
        insert into public.promo_code_uses
          (promo_code_id, bot_id, customer_tg_id, customer_phone, order_id, discount_uzs)
        values
          (${promoCodeId}::uuid, ${bot.id}::uuid, ${tgUser?.id ?? null}::bigint,
           ${body.customer_phone}, ${orderId}::uuid, ${promoDiscount}::int)
      `;
      await dbSql`
        update public.promo_codes set used_count = used_count + 1 where id = ${promoCodeId}::uuid
      `;
    } catch (e) {
      console.error("[promo-record]", (e as Error).message);
    }
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

  // Lead ham yozamiz (eski statistika va dashboard kompatibilligi uchun)
  await sb.from("leads").insert({
    bot_id: bot.id,
    conversation_id: convId,
    name: body.customer_name,
    phone: body.customer_phone,
    request: requestText,
  });

  // Admin Telegram'ga xabar — BeautyShop pattern: inline tugmalar bilan
  // (✅ Qabul qildim / ❌ Bekor / 💬 Mijozga yozish). Status o'zgargan sayin
  // tugmalar yangilanadi (runtime callbacks bilan).
  if (bot.admin_chat_id && orderId) {
    try {
      const token = await getBotToken(bot.id);
      const tg = new TgBot(token);
      const displayId = `ORD-${orderId.slice(-6).toUpperCase()}`;
      const adminLines = [
        "🛒 <b>Yangi WebApp buyurtmasi</b>",
        `🆔 ${displayId}`,
        "📊 Status: <b>Yangi</b>",
        "",
        `Ism: ${escapeHtml(body.customer_name ?? "—")}`,
        `Tel: <code>${escapeHtml(body.customer_phone)}</code>`,
        tgUser?.username
          ? `Telegram: @${escapeHtml(tgUser.username)}`
          : "",
        "",
        "<b>Mahsulotlar:</b>",
        ...body.items.map(
          (it) => `• ${escapeHtml(it.name)} × ${it.qty} = ${escapeHtml(it.price)}`
        ),
        "",
        promoDiscount > 0
          ? `🎟 Promo: <b>${escapeHtml(body.promo_code ?? "")}</b> (-${promoDiscount.toLocaleString("uz-UZ")} so'm)`
          : "",
        `<b>JAMI: ${promoFinalTotal.toLocaleString("uz-UZ")} so'm</b>`,
        "",
        body.note ? `Izoh: ${escapeHtml(body.note)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const inlineKeyboard: { text: string; callback_data?: string; url?: string }[][] = [
        [
          { text: "✅ Qabul qildim", callback_data: `order_accept_${orderId}` },
          { text: "❌ Bekor", callback_data: `order_cancel_${orderId}` },
        ],
      ];
      if (tgUser?.id) {
        inlineKeyboard.push([
          { text: "💬 Mijozga yozish", url: `tg://user?id=${tgUser.id}` },
        ]);
      }

      await tg.sendMessage(bot.admin_chat_id, adminLines, {
        reply_markup: { inline_keyboard: inlineKeyboard },
      });
    } catch {
      // Admin xabari xato bo'lsa ham buyurtma qabul qilingan
    }
  }

  return NextResponse.json({ ok: true, order_id: orderId ?? null });
}
