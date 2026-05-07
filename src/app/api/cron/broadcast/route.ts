// Vercel Cron har daqiqada chaqiradi.
// vercel.json ichida: { "crons": [{ "path": "/api/cron/broadcast", "schedule": "* * * * *" }] }
// Har chaqiriqda 1 ta active broadcast’ning 25 ta pending recipient’ini yuboradi.
// Telegram bot 30 msg/sec limit — 25/min juda xavfsiz. Pro tarif uchun batch oshirish mumkin.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getBotToken } from "@/lib/bots";
import { TgBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 25;

export async function GET(req: Request) {
  // Vercel cron’dan kelganini tekshirish (CRON_SECRET ixtiyoriy lekin tavsiya etiladi)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const sb = db();
  // Eng eski queued/sending broadcast
  const { data: bcs } = await sb
    .from("broadcasts")
    .select("*")
    .in("status", ["queued", "sending"])
    .order("scheduled_at", { ascending: true })
    .limit(1);
  const bc = bcs?.[0];
  if (!bc) return NextResponse.json({ ok: true, processed: 0 });

  if (bc.status === "queued") {
    await sb
      .from("broadcasts")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", bc.id);
  }

  // Bot token
  let token: string;
  try {
    token = await getBotToken(bc.bot_id);
  } catch {
    await sb
      .from("broadcasts")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", bc.id);
    return NextResponse.json({ ok: true, error: "no_token" });
  }
  const tg = new TgBot(token);

  const { data: recipients } = await sb
    .from("broadcast_recipients")
    .select("*")
    .eq("broadcast_id", bc.id)
    .eq("status", "pending")
    .limit(BATCH);

  if (!recipients || recipients.length === 0) {
    // Tugadi
    const { count: pendingLeft } = await sb
      .from("broadcast_recipients")
      .select("id", { count: "exact", head: true })
      .eq("broadcast_id", bc.id)
      .eq("status", "pending");
    if ((pendingLeft ?? 0) === 0) {
      await sb
        .from("broadcasts")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", bc.id);
    }
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      await tg.sendMessage(r.tg_chat_id, bc.text);
      await sb
        .from("broadcast_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    } catch (e) {
      const msg = (e as Error).message;
      const newAttempts = (r.attempts ?? 0) + 1;
      // 3 marta urinish
      const finalStatus = newAttempts >= 3 ? "failed" : "pending";
      await sb
        .from("broadcast_recipients")
        .update({ status: finalStatus, error: msg, attempts: newAttempts })
        .eq("id", r.id);
      if (finalStatus === "failed") failed++;
    }
    // 1 sek pauza — Telegram limit
    await new Promise((res) => setTimeout(res, 250));
  }

  // Counterlarni yangilash
  const { data: stats } = await sb
    .from("broadcast_recipients")
    .select("status")
    .eq("broadcast_id", bc.id);
  const sentTotal = stats?.filter((s) => s.status === "sent").length ?? 0;
  const failTotal = stats?.filter((s) => s.status === "failed").length ?? 0;
  const pendingTotal = stats?.filter((s) => s.status === "pending").length ?? 0;

  const status = pendingTotal === 0 ? "done" : "sending";
  const update: Record<string, unknown> = {
    sent_count: sentTotal,
    failed_count: failTotal,
    status,
  };
  if (status === "done") update.finished_at = new Date().toISOString();
  await sb.from("broadcasts").update(update).eq("id", bc.id);

  return NextResponse.json({ ok: true, sent, failed, pending: pendingTotal });
}
