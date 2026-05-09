// Custom domain CRUD + verify endpoint.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { addDomain, listDomains, removeDomain, verifyDomain } from "@/lib/custom_domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });
  return NextResponse.json({ domains: await listDomains(bot.id) });
}

const PostBody = z.object({
  domain: z.string().min(3).max(253),
  action: z.enum(["add", "verify", "remove"]).optional().default("add"),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_input", issues: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.action === "add") {
    const r = await addDomain(bot.id, parsed.data.domain);
    if ("error" in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json({ domain: r });
  }
  if (parsed.data.action === "verify") {
    const r = await verifyDomain(bot.id, parsed.data.domain);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (parsed.data.action === "remove") {
    await removeDomain(bot.id, parsed.data.domain);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
