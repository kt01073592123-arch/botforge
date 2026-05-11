// Seller Mini App: rasm yuklash (Vercel Blob) — initData auth bilan.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifySellerForBot } from "@/lib/seller_auth";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await rateLimit({
    scope: "api_user",
    key: `seller_upload|${auth.session.appUserId}`,
    windowSeconds: 60,
    limit: 30,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  try {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "5 MB dan oshmasin" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "JPG/PNG/WEBP/GIF" }, { status: 400 });
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
