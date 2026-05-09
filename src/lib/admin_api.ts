// Admin panel uchun query helpers — bitta joyda butun panel uchun ma'lumot.

import { db } from "./supabase/server";

export type Overview = {
  total_users: number;
  banned_users: number;
  new_users_7d: number;
  total_bots: number;
  active_bots: number;
  paused_bots: number;
  total_messages_30d: number;
  total_leads_30d: number;
  total_bookings_30d: number;
  total_orders_30d: number;
  ai_cost_30d: number;
  ai_tokens_30d: number;
  paid_subscriptions: number;
  mrr_uzs: number;
  webhook_errors_24h: number;
};

export async function getOverview(): Promise<Overview> {
  const { data } = await db().rpc<Overview>("admin_overview_stats");
  return (data as Overview) ?? {
    total_users: 0, banned_users: 0, new_users_7d: 0,
    total_bots: 0, active_bots: 0, paused_bots: 0,
    total_messages_30d: 0, total_leads_30d: 0, total_bookings_30d: 0, total_orders_30d: 0,
    ai_cost_30d: 0, ai_tokens_30d: 0,
    paid_subscriptions: 0, mrr_uzs: 0, webhook_errors_24h: 0,
  };
}

export type SellerRow = {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  language_code: string | null;
  is_admin: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
  last_seen_at: string;
  bot_count: number;
  plan_id: string | null;
};

export async function listSellers(opts: { search?: string; limit?: number } = {}): Promise<SellerRow[]> {
  const sb = db();
  let q = sb
    .from("app_users")
    .select("id, telegram_id, telegram_username, first_name, language_code, is_admin, banned_at, ban_reason, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(opts.limit ?? 100);

  // search by telegram_id, username, first_name (oddiy contains)
  if (opts.search) {
    const s = opts.search.trim();
    if (/^\d+$/.test(s)) q = q.eq("telegram_id", Number(s));
    else q = q.eq("telegram_username", s.replace(/^@/, ""));
  }

  const { data: users } = await q;
  if (!users) return [];

  // Bot count + plan har user uchun (kichik bo'lganida ham OK; yiriklarda materialized view kerak)
  const ids = (users as Array<{ id: string }>).map((u) => u.id);
  if (ids.length === 0) return [];

  const [{ data: botRows }, { data: subRows }] = await Promise.all([
    sb.from("bots").select("owner_id").in("owner_id", ids).is("deleted_at", null),
    sb.from("subscriptions").select("user_id, plan_id").in("user_id", ids),
  ]);

  const botCount = new Map<string, number>();
  for (const b of (botRows ?? []) as Array<{ owner_id: string }>) {
    botCount.set(b.owner_id, (botCount.get(b.owner_id) ?? 0) + 1);
  }
  const planByUser = new Map<string, string>();
  for (const s of (subRows ?? []) as Array<{ user_id: string; plan_id: string }>) {
    planByUser.set(s.user_id, s.plan_id);
  }

  return (users as SellerRow[]).map((u) => ({
    ...u,
    bot_count: botCount.get(u.id) ?? 0,
    plan_id: planByUser.get(u.id) ?? null,
  }));
}

export type BotAdminRow = {
  id: string;
  name: string;
  business_name: string | null;
  tg_username: string | null;
  status: string;
  ai_model: string;
  monthly_messages_used: number;
  monthly_message_limit: number;
  owner_id: string;
  owner_name: string | null;
  owner_telegram_id: number | null;
  created_at: string;
  cost_30d: number;
};

export async function listBots(opts: { search?: string; limit?: number; status?: string } = {}): Promise<BotAdminRow[]> {
  const sb = db();
  let q = sb
    .from("bots")
    .select("id, name, business_name, tg_username, status, ai_model, monthly_messages_used, monthly_message_limit, owner_id, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.search) q = q.eq("tg_username", opts.search.replace(/^@/, ""));

  const { data: bots } = await q;
  if (!bots || bots.length === 0) return [];

  const botList = bots as Array<Record<string, unknown>>;
  const ownerIds = [...new Set(botList.map((b) => b.owner_id as string))];

  const [{ data: owners }, { data: usage }] = await Promise.all([
    sb.from("app_users").select("id, first_name, telegram_id").in("id", ownerIds),
    sb.from("ai_usage")
      .select("bot_id, cost_usd")
      .in("bot_id", botList.map((b) => b.id as string))
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const ownerMap = new Map<string, { name: string | null; tg: number }>();
  for (const o of (owners ?? []) as Array<{ id: string; first_name: string | null; telegram_id: number }>) {
    ownerMap.set(o.id, { name: o.first_name, tg: o.telegram_id });
  }
  const cost30d = new Map<string, number>();
  for (const u of (usage ?? []) as Array<{ bot_id: string; cost_usd: number }>) {
    cost30d.set(u.bot_id, (cost30d.get(u.bot_id) ?? 0) + Number(u.cost_usd ?? 0));
  }

  return botList.map((b) => {
    const owner = ownerMap.get(b.owner_id as string);
    return {
      ...(b as object),
      owner_name: owner?.name ?? null,
      owner_telegram_id: owner?.tg ?? null,
      cost_30d: cost30d.get(b.id as string) ?? 0,
    } as BotAdminRow;
  });
}

export type RevenueRow = {
  date: string;
  paid_amount_uzs: number;
  payment_count: number;
};

export async function getRevenueDaily(days = 30): Promise<RevenueRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await db()
    .from("payments")
    .select("amount_uzs, paid_at, status")
    .gte("paid_at", since);
  if (!data) return [];

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const p of data as Array<{ amount_uzs: number; paid_at: string | null; status: string }>) {
    if (!p.paid_at || p.status !== "paid") continue;
    const day = p.paid_at.slice(0, 10);
    const cur = byDay.get(day) ?? { sum: 0, count: 0 };
    cur.sum += Number(p.amount_uzs ?? 0);
    cur.count++;
    byDay.set(day, cur);
  }
  return [...byDay.entries()]
    .map(([date, v]) => ({ date, paid_amount_uzs: v.sum, payment_count: v.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type PlanStatRow = {
  plan_id: string;
  plan_name: string;
  active_count: number;
  mrr_uzs: number;
};

export async function getPlanStats(): Promise<PlanStatRow[]> {
  const sb = db();
  const [{ data: subs }, { data: plans }] = await Promise.all([
    sb.from("subscriptions").select("plan_id, active").eq("active", true),
    sb.from("plans").select("id, name, price_uzs, sort_order").order("sort_order"),
  ]);
  const subList = (subs ?? []) as Array<{ plan_id: string }>;
  const planList = (plans ?? []) as Array<{ id: string; name: string; price_uzs: number }>;

  const counts = new Map<string, number>();
  for (const s of subList) counts.set(s.plan_id, (counts.get(s.plan_id) ?? 0) + 1);

  return planList.map((p) => ({
    plan_id: p.id,
    plan_name: p.name,
    active_count: counts.get(p.id) ?? 0,
    mrr_uzs: (counts.get(p.id) ?? 0) * p.price_uzs,
  }));
}

export type AnomalyRow = {
  bot_id: string;
  bot_name: string | null;
  cost_24h: number;
  avg_cost_7d: number;
  ratio: number;
};

export async function getAnomalies(threshold = 3.0): Promise<AnomalyRow[]> {
  const { data } = await db().rpc<AnomalyRow[]>("admin_ai_anomalies", { p_threshold: threshold });
  return (data as unknown as AnomalyRow[]) ?? [];
}

export type AiCostBotRow = {
  bot_id: string;
  bot_name: string | null;
  total_cost_usd: number;
  total_tokens: number;
  message_count: number;
};

export async function getTopAiCostBots(days = 30, limit = 20): Promise<AiCostBotRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const sb = db();
  const { data: usage } = await sb
    .from("ai_usage")
    .select("bot_id, cost_usd, prompt_tokens, completion_tokens")
    .gte("created_at", since);
  if (!usage) return [];

  const agg = new Map<string, { cost: number; tokens: number; count: number }>();
  for (const u of usage as Array<{ bot_id: string; cost_usd: number; prompt_tokens: number; completion_tokens: number }>) {
    const cur = agg.get(u.bot_id) ?? { cost: 0, tokens: 0, count: 0 };
    cur.cost += Number(u.cost_usd ?? 0);
    cur.tokens += (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
    cur.count++;
    agg.set(u.bot_id, cur);
  }

  const top = [...agg.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, limit);
  const ids = top.map(([id]) => id);
  const { data: bots } = await sb.from("bots").select("id, name").in("id", ids);
  const nameMap = new Map<string, string>();
  for (const b of (bots ?? []) as Array<{ id: string; name: string }>) nameMap.set(b.id, b.name);

  return top.map(([botId, v]) => ({
    bot_id: botId,
    bot_name: nameMap.get(botId) ?? null,
    total_cost_usd: v.cost,
    total_tokens: v.tokens,
    message_count: v.count,
  }));
}

export type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_telegram_id: number | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export async function listAuditLogs(limit = 100): Promise<AuditRow[]> {
  const { data } = await db()
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditRow[]) ?? [];
}

export type SystemHealth = {
  webhook_errors_24h: number;
  recent_errors: Array<{ id: string; bot_id: string; error: string; created_at: string }>;
  rate_limit_active: number;
};

export async function getSystemHealth(): Promise<SystemHealth> {
  const sb = db();
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count: errCount } = await sb
    .from("webhook_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  const { data: recent } = await sb
    .from("webhook_logs")
    .select("id, bot_id, error, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  const { count: rateLimitCount } = await sb
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .gte("window_start", new Date(Date.now() - 60_000).toISOString());

  return {
    webhook_errors_24h: errCount ?? 0,
    recent_errors: (recent as SystemHealth["recent_errors"]) ?? [],
    rate_limit_active: rateLimitCount ?? 0,
  };
}
