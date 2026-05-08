// Rasm yuklash — Vercel Blob orqali.
// POST multipart/form-data: file=<image>
// Yoki Telegram’dan kelgan file_id ni URL’ga o‘girish.
// Returns: { url }

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const ok = await rateLimit({
      scope: "api_user",
      key: `upload|${s.uid}`,
      windowSeconds: 60,
      limit: 30,
    });
    if (!ok) return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fayl 5 MB dan kichik bo‘lishi kerak` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Faqat JPG, PNG, WEBP, GIF" },
        { status: 400 }
      );
    }

    const ext = file.type.split("/")[1] ?? "jpg";
    const filename = `bots/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
