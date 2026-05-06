import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { listBots, createBot } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await requireSession();
    const bots = await listBots(s.uid);
    return NextResponse.json({ bots });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}

const CreateBody = z.object({
  templateId: z.string().min(1),
  name: z.string().min(2).max(80),
  businessName: z.string().max(120).optional(),
  language: z.enum(["uz", "ru", "en"]).default("uz"),
});

export async function POST(req: Request) {
  try {
    const s = await requireSession();
    const body = CreateBody.parse(await req.json());
    const bot = await createBot({
      ownerId: s.uid,
      templateId: body.templateId,
      name: body.name,
      businessName: body.businessName,
      language: body.language,
    });
    return NextResponse.json({ bot });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
