// Telegram user'ni app_users jadvaliga upsert qiladi.

import { db } from "./supabase/server";
import type { AppUser } from "./supabase/types";
import type { TgWebAppUser } from "./telegram";

export async function upsertTelegramUser(tg: TgWebAppUser): Promise<AppUser> {
  const sb = db();
  const { data, error } = await sb
    .from("app_users")
    .upsert(
      {
        telegram_id: tg.id,
        telegram_username: tg.username ?? null,
        first_name: tg.first_name ?? null,
        last_name: tg.last_name ?? null,
        language_code: tg.language_code ?? "uz",
        photo_url: tg.photo_url ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`upsertTelegramUser: ${error.message}`);
  return data as AppUser;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const { data } = await db().from("app_users").select("*").eq("id", id).maybeSingle();
  return (data as AppUser) ?? null;
}
