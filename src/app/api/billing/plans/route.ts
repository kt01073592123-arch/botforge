import { NextResponse } from "next/server";
import { listPlans, getSubscription } from "@/lib/billing";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await listPlans();
  const sess = await getSession();
  const sub = sess ? await getSubscription(sess.uid) : null;
  return NextResponse.json({ plans, subscription: sub });
}
