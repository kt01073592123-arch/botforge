// Mini App: mijoz "Ruxsat" bersa, push subscription server'ga saqlanadi.
// POST: { endpoint, p256dh, auth, init_data?, tg_id? }
// GET: { vapid_public_key } — Mini App subscription qurish uchun foydalanadi

import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getPublicVapidKey } from "@/lib/push";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(10).max(500),
  init_data: z.string().optional(),
  tg_id: z.number().int().optional(),
  user_agent: z.string().max(300).optional(),
});

function parseTgUserId(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const u = params.get("user");
    if (!u) return null;
    const parsed = JSON.parse(u) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const key = getPublicVapidKey();
  if (!key) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({ enabled: true, vapid_public_key: key });
}

export async function POST(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `push_sub|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 10,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  try {
    const { username } = await ctx.params;
    const body = Body.parse(await req.json());

    const dbSql = sql();
    const bots = (await dbSql`
      select id from public.bots
       where tg_username = ${username} and deleted_at is null
       limit 1
    `) as Array<{ id: string }>;
    if (bots.length === 0) {
      return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });
    }

    const tgId =
      body.tg_id ??
      (body.init_data ? parseTgUserId(body.init_data) : null) ??
      null;

    await dbSql`
      insert into public.push_subscriptions
        (bot_id, customer_tg_id, endpoint, p256dh, auth_key, user_agent)
      values
        (${bots[0].id}::uuid, ${tgId}::bigint, ${body.endpoint},
         ${body.p256dh}, ${body.auth}, ${body.user_agent ?? null})
      on conflict (bot_id, endpoint) do update set
        customer_tg_id = excluded.customer_tg_id,
        p256dh = excluded.p256dh,
        auth_key = excluded.auth_key,
        user_agent = excluded.user_agent,
        last_used_at = now()
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await ctx.params;
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint kerak" }, { status: 400 });
    }

    const dbSql = sql();
    const bots = (await dbSql`
      select id from public.bots where tg_username = ${username} limit 1
    `) as Array<{ id: string }>;
    if (bots.length === 0) {
      return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });
    }
    await dbSql`
      delete from public.push_subscriptions
       where bot_id = ${bots[0].id}::uuid and endpoint = ${endpoint}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
