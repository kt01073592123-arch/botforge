// /api/admin/broadcast — admin'lardan kelgan platforma broadcast.
//
// POST: yangi announcement yaratadi va darhol yuborishni boshlaydi (background-da).
// GET: tarix.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/admin_auth";
import { db } from "@/lib/supabase/server";
import { TgBot } from "@/lib/telegram";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(5).max(2000),
  audience: z.enum(["all", "free", "paid", "pro", "max"]).default("all"),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { data } = await db()
    .from("platform_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ announcements: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_input", issues: parsed.error.issues }, { status: 400 });
  }

  const sb = db();
  // ── Audience filter
  let userQuery = sb
    .from("app_users")
    .select("id, telegram_id, banned_at")
    .is("banned_at", null);

  if (parsed.data.audience !== "all") {
    // plan asosida filtr — subscriptions'dan target user_id'larni olish kerak
    let planQuery = sb.from("subscriptions").select("user_id, plan_id").eq("active", true);
    if (parsed.data.audience === "paid") {
      planQuery = planQuery.in("plan_id", ["start", "pro", "max"]);
    } else {
      planQuery = planQuery.eq("plan_id", parsed.data.audience);
    }
    const { data: subs } = await planQuery;
    const ids = ((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id);
    if (ids.length === 0) {
      return NextResponse.json({ error: "no_recipients" }, { status: 400 });
    }
    userQuery = userQuery.in("id", ids);
  }

  const { data: users } = await userQuery;
  const targets = ((users ?? []) as Array<{ id: string; telegram_id: number }>).filter((u) => u.telegram_id);
  if (targets.length === 0) {
    return NextResponse.json({ error: "no_recipients" }, { status: 400 });
  }

  // Announcement yozuvi
  const { data: ann } = await sb
    .from("platform_announcements")
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      audience: parsed.data.audience,
      total_recipients: targets.length,
      status: "sending",
      started_at: new Date().toISOString(),
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (!ann) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  const annId = (ann as { id: string }).id;

  await logAdminAction({
    actorUserId: auth.user.id,
    actorTelegramId: auth.user.telegram_id,
    action: "broadcast_sent",
    targetType: "announcement",
    targetId: annId,
    details: { audience: parsed.data.audience, recipients: targets.length },
  });

  // ── Yuborish (sequential, throttled — Telegram limit 30/sek)
  const platformBot = new TgBot(env().TELEGRAM_BOT_TOKEN);
  const message = `📢 <b>${escapeHtml(parsed.data.title)}</b>\n\n${escapeHtml(parsed.data.body)}`;

  let sent = 0;
  let failed = 0;
  for (const u of targets) {
    try {
      await platformBot.sendMessage(u.telegram_id, message);
      sent++;
      // ~25/sek throttle
      await sleep(40);
    } catch (e) {
      failed++;
      console.error(`[broadcast] ${u.telegram_id}:`, (e as Error).message);
    }
    // Har 50 ta yuborilgach progress yangilash
    if ((sent + failed) % 50 === 0) {
      await sb
        .from("platform_announcements")
        .update({ total_sent: sent, total_failed: failed })
        .eq("id", annId);
    }
  }

  await sb
    .from("platform_announcements")
    .update({
      total_sent: sent,
      total_failed: failed,
      status: "done",
      finished_at: new Date().toISOString(),
    })
    .eq("id", annId);

  return NextResponse.json({
    ok: true,
    announcement_id: annId,
    sent,
    failed,
    total: targets.length,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
