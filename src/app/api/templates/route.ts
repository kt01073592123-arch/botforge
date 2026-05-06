import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await listTemplates();
  return NextResponse.json({ templates });
}
