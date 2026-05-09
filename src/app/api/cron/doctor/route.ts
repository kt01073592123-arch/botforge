// Bot Doctor cron — har dushanba ertalab ishga tushadi va hamma faol botlarni tahlil qiladi.
// Vercel.json'da `0 7 * * 1` (dushanba 07:00 UTC).

import { NextResponse } from "next/server";
import { diagnoseAllBots } from "@/lib/bot_doctor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  // Vercel cron secret header (yoki query string)
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const result = await diagnoseAllBots();
  return NextResponse.json({ ok: true, ...result });
}
