// AI prompt -> bot config endpoint.
// 2 ta rejim:
//   1) POST {prompt, ...} -> faqat config preview qaytaradi
//   2) POST {prompt, ..., create:true, name, ...} -> bot yaratadi va ixtiyoriy
//      ravishda sayt dizaynini ham fonda generatsiya qiladi.
//
// BeautyShop pack (shop_beauty_seoul) sklet sifatida ishlaydi.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireSession } from "@/lib/auth";
import { generateBotFromPrompt } from "@/lib/ai/bot_generator";
import { getPack } from "@/lib/template_packs";
import { db } from "@/lib/supabase/server";
import { canCreateBot } from "@/lib/billing";
import { env } from "@/lib/env";
import { generateDesignKit } from "@/lib/design/orchestrator";
import { ensureDefaultPage } from "@/lib/page_editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  prompt: z.string().min(10).max(2000),
  botName: z.string().min(2).max(80).optional(),
  businessName: z.string().max(120).optional(),
  verticalHint: z
    .enum(["shop", "salon", "restaurant", "course", "service"])
    .optional(),
  language: z.enum(["uz", "ru", "en"]).default("uz"),
  create: z.boolean().default(false),
  name: z.string().min(2).max(80).optional(),
  generateSite: z.boolean().default(true),
});

const SKELETON_PACK_ID = "shop_beauty_seoul";

export async function POST(req: Request) {
  try {
    const s = await requireSession();
    const body = Body.parse(await req.json());

    // 1) AI generatsiya
    const result = await generateBotFromPrompt({
      prompt: body.prompt,
      botName: body.botName,
      businessName: body.businessName,
      verticalHint: body.verticalHint,
      language: body.language,
    });

    // Logga yozamiz (analytics + cost tracking)
    try {
      await db()
        .from("ai_generated_configs")
        .insert({
          owner_id: s.uid,
          user_prompt: body.prompt,
          generated_config: result.config,
          base_pack_id: SKELETON_PACK_ID,
          model: env().AI_MODEL,
          tokens_input: result.tokens_input,
          tokens_output: result.tokens_output,
          cost_usd: result.cost_usd,
        });
    } catch (e) {
      console.error("[from-prompt] log insert failed:", e);
    }

    // 2) Faqat preview kerak bo'lsa
    if (!body.create) {
      return NextResponse.json({
        config: result.config,
        cost_usd: result.cost_usd,
        duration_ms: result.duration_ms,
        skeleton_pack_id: SKELETON_PACK_ID,
      });
    }

    // 3) Bot yaratish
    if (!body.name) {
      return NextResponse.json(
        { error: "Bot yaratish uchun name kerak" },
        { status: 400 },
      );
    }

    const ok = await canCreateBot(s.uid);
    if (!ok) {
      return NextResponse.json(
        { error: "Tarif limiti tugadi. Tarifni yangilang yoki keraksiz botni o'chiring." },
        { status: 402 },
      );
    }

    const skeleton = await getPack(SKELETON_PACK_ID);
    if (!skeleton) {
      return NextResponse.json(
        {
          error:
            "Sklet pack (shop_beauty_seoul) topilmadi. Avval 0023_beautyshop_pack.sql migration qollang.",
        },
        { status: 500 },
      );
    }

    const sb = db();
    const cfg = result.config;

    const resolvedServices = cfg.services.map((s) => {
      const price = s.base_price_uzs;
      const priceStr =
        price === 0 ? "Bepul" : `${price.toLocaleString("uz-UZ")} so'm`;
      return { name: s.name, price: priceStr, duration: s.duration };
    });

    const { data: botRow, error } = await sb
      .from("bots")
      .insert({
        owner_id: s.uid,
        template_id: SKELETON_PACK_ID,
        name: body.name,
        business_name: body.businessName ?? null,
        business_type: cfg.business_type,
        language: body.language,
        status: "draft",
        ai_model: env().AI_MODEL,
        system_prompt: cfg.system_prompt,
        welcome_message: cfg.welcome_message,
        webhook_secret: randomBytes(24).toString("hex"),
      })
      .select("*")
      .single();

    if (error || !botRow) {
      return NextResponse.json(
        { error: error?.message ?? "Bot yaratishda xato" },
        { status: 500 },
      );
    }

    // bot_data ga AI-generated ma'lumotlar
    await sb.from("bot_data").insert({
      bot_id: botRow.id,
      services: resolvedServices,
      faq: cfg.faq,
      working_hours: cfg.working_hours,
      contacts: cfg.contacts,
    });

    try {
      await sb
        .from("ai_generated_configs")
        .update({ bot_id: botRow.id })
        .eq("owner_id", s.uid)
        .order("created_at", { ascending: false })
        .limit(1);
    } catch {}

    // SAYT DIZAYNI - Design Kit (brand+copy+hero image) + default page layout
    // Background, response'ni bloklamaydi.
    let siteJobStarted = false;
    if (body.generateSite) {
      siteJobStarted = true;
      void (async () => {
        try {
          await generateDesignKit({
            botId: botRow.id,
            businessName: body.businessName ?? body.name ?? cfg.business_type,
            businessType: cfg.business_type,
            vertical: cfg.vertical,
            description: body.prompt,
            preferredMood: cfg.brand_kit.font_hint,
            language: body.language,
          });
        } catch (e) {
          console.error("[from-prompt] generateDesignKit failed:", e);
        }
        try {
          await ensureDefaultPage(botRow.id, cfg.vertical);
        } catch (e) {
          console.error("[from-prompt] ensureDefaultPage failed:", e);
        }
      })();
    }

    return NextResponse.json({
      bot: botRow,
      config: cfg,
      skeleton_pack_id: SKELETON_PACK_ID,
      cost_usd: result.cost_usd,
      site_job_started: siteJobStarted,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validatsiya xatosi", details: e.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: (e as Error).message ?? "Server xatosi" },
      { status: 400 },
    );
  }
}
