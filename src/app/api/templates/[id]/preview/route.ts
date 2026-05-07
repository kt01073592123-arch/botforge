// Live demo: pack’ni sinab ko‘rish (auth shart emas, lekin rate-limited).
// Foydalanuvchi mijoz bo‘lib bot bilan suhbatlashishi uchun.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getPack, resolveConfig, type WizardChoices } from "@/lib/template_packs";
import { anthropic } from "@/lib/ai/anthropic";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { env } from "@/lib/env";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
  sub_type: z.string().optional(),
  tier: z.string().optional(),
  tone: z.string().optional(),
});

function buildBusinessContext(resolved: ReturnType<typeof resolveConfig>): string {
  const lines: string[] = ["BIZNES NOMI: [Demo]"];
  if (resolved.services?.length) {
    lines.push("\nXIZMATLAR VA NARXLAR:");
    for (const s of resolved.services) {
      const dur = s.duration ? ` (${s.duration})` : "";
      lines.push(`- ${s.name} — ${s.price}${dur}`);
    }
  }
  if (resolved.working_hours && Object.keys(resolved.working_hours).length) {
    lines.push("\nISH VAQTI:");
    const days: Record<string, string> = {
      mon: "Du", tue: "Se", wed: "Ch", thu: "Pa",
      fri: "Ju", sat: "Sh", sun: "Ya",
    };
    for (const [d, h] of Object.entries(resolved.working_hours)) {
      if (!h) lines.push(`- ${days[d] ?? d}: dam`);
      else lines.push(`- ${days[d] ?? d}: ${h[0]}:00–${h[1]}:00`);
    }
  }
  if (resolved.faq?.length) {
    lines.push("\nFAQ:");
    for (const f of resolved.faq) lines.push(`Q: ${f.q}\nA: ${f.a}`);
  }
  return lines.join("\n");
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `preview|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 20,
  });
  if (!ok) {
    return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });
  }

  const { id } = await ctx.params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yaroqsiz body" }, { status: 400 });
  }

  const pack = await getPack(id);
  if (!pack) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (!pack.is_pack) {
    return NextResponse.json(
      { error: "Bu template demo uchun mavjud emas" },
      { status: 400 }
    );
  }

  const choices: WizardChoices = {
    sub_type_id: body.sub_type,
    tier_id: body.tier,
    tone_id: body.tone,
  };
  const resolved = resolveConfig(pack, choices);

  const system = [
    resolved.system_prompt,
    "\n\n=== BUSINESS_CONTEXT ===\n",
    buildBusinessContext(resolved),
    "\n\n[DEMO REJIMI: bu sinov, save_lead/request_human chaqirma — faqat matn javob ber]",
  ].join("\n");

  const messages: Anthropic.MessageParam[] = [
    ...body.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: body.message },
  ];

  try {
    const response = await anthropic().messages.create({
      model: env().AI_MODEL,
      max_tokens: 600,
      system,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({
      reply: text || "…",
      welcome: resolved.welcome_message,
      buttons: resolved.buttons,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
