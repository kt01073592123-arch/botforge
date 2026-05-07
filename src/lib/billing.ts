// Tarif/obuna helperlari

import { db } from "./supabase/server";

export type Plan = {
  id: string;
  name: string;
  price_uzs: number;
  bot_limit: number;
  message_limit: number;
  kb_chunks_limit: number;
  features: string[];
  sort_order: number;
};

export type Subscription = {
  user_id: string;
  plan_id: string;
  active: boolean;
  current_period_end: string | null;
  updated_at: string;
};

export async function listPlans(): Promise<Plan[]> {
  const { data } = await db()
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Plan[];
}

export async function getSubscription(userId: string): Promise<{ sub: Subscription; plan: Plan } | null> {
  await db().rpc("ensure_subscription", { p_user_id: userId });
  const { data } = await db()
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { plan, ...sub } = data as any;
  return { sub: sub as Subscription, plan: plan as Plan };
}

export async function canCreateBot(userId: string): Promise<boolean> {
  const { data } = await db().rpc("check_bot_limit", { p_user_id: userId });
  return data === true;
}

export async function upgradeSubscription(opts: {
  userId: string;
  planId: string;
  periodDays?: number;
}) {
  const { error } = await db().rpc("upgrade_subscription", {
    p_user_id: opts.userId,
    p_plan_id: opts.planId,
    p_period_days: opts.periodDays ?? 30,
  });
  if (error) throw new Error(error.message);
}
