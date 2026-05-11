// Seller Mini App auth: Telegram initData -> app_user -> bot ownership check.
// Har bir /api/admin/* endpoint shu helper'ni chaqiradi.

import { verifyTgInitData, type TgInitUser } from "./tg_init_data";
import { db } from "./db";
import { env } from "./env";

export type SellerSession = {
  user: TgInitUser;
  appUserId: string;
  isAdmin: boolean;
};

// initData faqat platform bot tomonidan signed bo'ladi. Boshqa bot'lar emas.
export async function verifySeller(initData: string): Promise<SellerSession | null> {
  const result = verifyTgInitData(initData, env().TELEGRAM_BOT_TOKEN);
  if (!result.valid || !result.user) return null;

  const sb = db();
  const { data: row } = await sb
    .from("app_users")
    .select("id, is_admin")
    .eq("telegram_id", result.user.id)
    .maybeSingle();

  if (!row) return null;

  return {
    user: result.user,
    appUserId: (row as { id: string }).id,
    isAdmin: !!(row as { is_admin?: boolean }).is_admin,
  };
}

// Bot egasi (yoki super-admin) ekanligini tekshiradi.
export async function verifySellerForBot(
  initData: string,
  botId: string,
): Promise<{ session: SellerSession; ownerOk: boolean } | null> {
  const session = await verifySeller(initData);
  if (!session) return null;

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("owner_id")
    .eq("id", botId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!bot) return null;

  const ownerOk =
    session.isAdmin || (bot as { owner_id: string }).owner_id === session.appUserId;
  return { session, ownerOk };
}
