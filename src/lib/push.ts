// Web Push (VAPID) — buyurtma statusi o'zgarganda mijozga push yuboradi.
// Env'lar: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)

import webpush from "web-push";
import { sql } from "./db";

function stripBom(s: string | undefined): string | undefined {
  return s?.replace(/^﻿/, "").trim();
}

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = stripBom(process.env.VAPID_PUBLIC_KEY);
  const priv = stripBom(process.env.VAPID_PRIVATE_KEY);
  const subject = stripBom(process.env.VAPID_SUBJECT) ?? "mailto:noreply@botforge.uz";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  bot_username?: string;
  data?: Record<string, unknown>;
};

type SubRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

// Bitta mijozga (tg_user_id) tegishli barcha push subscription'larga yuboradi.
// Stale (410 Gone) subscription'lar avtomatik o'chiriladi.
export async function sendPushToCustomer(opts: {
  botId: string;
  customerTgId: number;
  payload: PushPayload;
}): Promise<{ sent: number; failed: number; removed: number }> {
  if (!ensureConfigured()) {
    return { sent: 0, failed: 0, removed: 0 };
  }
  const dbSql = sql();
  const subs = (await dbSql`
    select id, endpoint, p256dh, auth_key
      from public.push_subscriptions
     where bot_id = ${opts.botId}
       and customer_tg_id = ${opts.customerTgId}
  `) as unknown as SubRow[];

  if (subs.length === 0) return { sent: 0, failed: 0, removed: 0 };

  const json = JSON.stringify(opts.payload);
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth_key },
          },
          json,
        );
        sent++;
        try {
          await dbSql`update public.push_subscriptions set last_used_at = now() where id = ${s.id}`;
        } catch {}
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Stale — o'chiramiz
          try {
            await dbSql`delete from public.push_subscriptions where id = ${s.id}`;
            removed++;
          } catch {}
        } else {
          failed++;
        }
      }
    }),
  );

  return { sent, failed, removed };
}

export function getPublicVapidKey(): string | null {
  return stripBom(process.env.VAPID_PUBLIC_KEY) ?? null;
}
