import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { createKbDocument } from "@/lib/kb";
import {
  parseFileBuffer,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "@/lib/file-parser";
import { extractProducts } from "@/lib/product-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) ?? "kb"; // "kb" | "products"

    if (!file) return NextResponse.json({ error: "Fayl yuklanmadi" }, { status: 400 });

    // Kengaytma tekshiruvi
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Faqat ${ALLOWED_EXTENSIONS.join(", ")} formatlar qo'llaniladi` },
        { status: 400 },
      );
    }

    // Hajm tekshiruvi
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fayl 10 MB dan kichik bo'lishi kerak (hozir: ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 400 },
      );
    }

    // Faylni parse qilish
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, pageCount, wordCount } = await parseFileBuffer(buffer, file.name);

    if (text.length < 10) {
      return NextResponse.json({ error: "Fayldan matn topilmadi" }, { status: 400 });
    }

    // KB hujjat sifatida saqlash
    const title = file.name.replace(/\.[^.]+$/, "");
    const doc = await createKbDocument({
      botId: id,
      title,
      content: text,
      source: `file:${ext}`,
    });

    // Mahsulot rejimi: AI bilan mahsulotlarni ajratamiz
    let products = null;
    if (mode === "products") {
      products = await extractProducts(text);
    }

    return NextResponse.json({
      document: doc,
      meta: { pageCount, wordCount, ext, size: file.size },
      products,
    });
  } catch (e) {
    console.error("[kb/upload]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
