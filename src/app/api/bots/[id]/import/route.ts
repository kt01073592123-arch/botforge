// Import flow: matn yoki URL’dan biznes ma'lumotlarini ajratadi va preview qaytaradi.
// 2 bosqich:
//   1) POST { text?, instagram_url? }              → { extracted } (apply qilmaydi)
//   2) POST { extracted, apply: true, options? }  → bot_data ga saqlanadi

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import {
  extractFromText,
  fetchInstagramOg,
  buildBotDataPatch,
  type ImportExtracted,
} from "@/lib/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ParseBody = z.object({
  text: z.string().max(20000).optional(),
  instagram_url: z.string().max(200).optional(),
});

const ApplyBody = z.object({
  apply: z.literal(true),
  extracted: z.object({
    business_name: z.string().nullable(),
    services: z.array(
      z.object({
        name: z.string(),
        price_uzs: z.number().nullable(),
        duration: z.string().nullable(),
      })
    ),
    contacts: z.object({
      phone: z.string().nullable(),
      address: z.string().nullable(),
      instagram: z.string().nullable(),
    }),
    working_hours_text: z.string().nullable(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    notes: z.string().nullable(),
  }),
  options: z
    .object({
      business_name: z.boolean().optional(),
      services: z.boolean().optional(),
      contacts: z.boolean().optional(),
      faq: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const ok = await rateLimit({
      scope: "api_user",
      key: `import|${s.uid}`,
      windowSeconds: 60,
      limit: 10,
    });
    if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

    const raw = await req.json();

    // === Apply bosqichi ===
    if (raw?.apply === true) {
      const body = ApplyBody.parse(raw);
      const patch = buildBotDataPatch(
        body.extracted as ImportExtracted,
        body.options ?? {
          business_name: true,
          services: true,
          contacts: true,
          faq: true,
        }
      );

      const sb = db();
      if (Object.keys(patch.bot).length > 0) {
        await sb.from("bots").update(patch.bot).eq("id", id);
      }
      if (Object.keys(patch.data).length > 0) {
        // Mavjud bot_data row bo'lmasa upsert
        await sb.from("bot_data").upsert({ bot_id: id, ...patch.data }, { onConflict: "bot_id" });
      }
      return NextResponse.json({ ok: true });
    }

    // === Parse bosqichi ===
    const body = ParseBody.parse(raw);
    let combined = body.text?.trim() ?? "";

    let og_used = false;
    let og_failed = false;
    if (body.instagram_url) {
      const og = await fetchInstagramOg(body.instagram_url);
      if (og) {
        combined = combined ? `${combined}\n\n${og}` : og;
        og_used = true;
      } else {
        og_failed = true;
      }
    }

    if (!combined || combined.length < 20) {
      return NextResponse.json(
        {
          error:
            og_failed
              ? "Instagram'dan avtomatik ololmadik (profil yopiq yoki blokda). Bio va post matnlarini qo'lda yopishtiring."
              : "Matn juda qisqa. Bio va bir nechta post matnini yopishtiring.",
          og_failed,
        },
        { status: 400 }
      );
    }

    const extracted = await extractFromText(combined);

    return NextResponse.json({
      extracted,
      meta: {
        text_length: combined.length,
        og_used,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
