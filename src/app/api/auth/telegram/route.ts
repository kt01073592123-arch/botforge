// Telegram WebApp initData orqali login.
// initData verify -> upsert user -> JWT cookie set.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyInitData } from "@/lib/telegram";
import { upsertTelegramUser } from "@/lib/users";
import { signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ initData: z.string().min(10) });

export async function POST(req: Request) {
  let payload;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }

  const v = verifyInitData(payload.initData);
  if (!v.ok || !v.user) {
    return NextResponse.json({ error: v.reason ?? "verify failed" }, { status: 401 });
  }

  const user = await upsertTelegramUser(v.user);
  const token = signSession({ uid: user.id, tg: user.telegram_id });
  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.telegram_username,
      photo_url: user.photo_url,
    },
  });
}
