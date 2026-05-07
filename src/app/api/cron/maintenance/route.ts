// Kunlik texnik xizmat: rate limit tozalash + oylik reset (oyning 1-kunida) + broadcast tick.
// Vercel Hobby plan kuniga 1 marta cron qo‘shadi. Tezroq broadcast yuborish uchun
// cron-job.org dan /api/cron/broadcast ni har daqiqada chaqirsangiz bo‘ladi (CRON_SECRET bilan).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const sb = db();
  const today = new Date();
  const isFirstOfMonth = today.getUTCDate() === 1;

  // 1. Rate limit cleanup
  await sb.rpc("rate_limit_cleanup");

  // 2. Oyning 1-kuni — oylik reset
  if (isFirstOfMonth) {
    await sb.rpc("reset_monthly_counters");
  }

  // 3. Broadcast tick — pending broadcastlarni 8 soniya ichida boribkelishi mumkin bo‘lganini yuboramiz
  const startedAt = Date.now();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let bcCount = 0;
  while (Date.now() - startedAt < 50_000 /* 50 sek */) {
    const res = await fetch(`${baseUrl}/api/cron/broadcast`, {
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });
    if (!res.ok) break;
    const data = await res.json();
    bcCount += (data?.sent ?? 0) + (data?.failed ?? 0);
    if ((data?.sent ?? 0) === 0 && (data?.failed ?? 0) === 0) break;
  }

  return NextResponse.json({
    ok: true,
    monthly_reset: isFirstOfMonth,
    broadcast_processed: bcCount,
  });
}
