// Rasm orqali mahsulot qidirish.
// POST multipart/form-data { image: File }
// → Claude Vision tavsif → OpenAI embed → cosine search → top 5 mahsulot

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { searchProductsByImage } from "@/lib/image-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  req: Request,
  ctx: { params: Promise<{ username: string }> },
) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `imgsearch|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 10,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  const { username } = await ctx.params;

  // Bot topish
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot topilmadi" }, { status: 404 });

  // Rasm olish
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData o'qilmadi" }, { status: 400 });
  }

  const image = formData.get("image") as File | null;
  if (!image) return NextResponse.json({ error: "Rasm yuklanmadi" }, { status: 400 });
  if (!ALLOWED_MIME.includes(image.type)) {
    return NextResponse.json({ error: "Faqat JPEG/PNG/WebP/GIF" }, { status: 400 });
  }
  if (image.size > MAX_SIZE) {
    return NextResponse.json({ error: "Rasm 5 MB dan kichik bo'lishi kerak" }, { status: 400 });
  }

  // Base64 ga o'tkazish
  const buffer = await image.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Vision + embedding + search
  const results = await searchProductsByImage(bot.id, base64, image.type);

  return NextResponse.json({ results });
}
