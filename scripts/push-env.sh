#!/bin/bash
# Vercel env vars ni avtomatik itaradi (script ichida qo‘yilgan qiymatlar bilan).
# Foydalanish: bash scripts/push-env.sh

set -e

push() {
  local name=$1
  local value=$2
  if [ -z "$value" ]; then
    echo "  skip $name (bo'sh)"
    return
  fi
  echo "+ $name"
  npx vercel env rm "$name" production --yes 2>/dev/null || true
  printf "%s" "$value" | npx vercel env add "$name" production
}

# === MENDA BOR (avtomatik) ===
push DATABASE_URL "postgresql://neondb_owner:npg_hn0wt1HLeJBT@ep-broad-breeze-al9i4b3p-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
push ENCRYPTION_KEY "1edf3324dec26022bafcb5c61090f531e3d41f0f667f72039ee6d90d8416cc16"
push WEBHOOK_SECRET "f3b192f2a0ebbd5a19148896f6e59b962937dd4d1bef9fcd"
push CRON_SECRET "352e7386386b3171ecb8af3774ec234dc5c065c5399ba362"
push AI_MODEL "gpt-4o-mini"
push WEBHOOK_BASE_URL "https://botforge-beige.vercel.app"
push NEXT_PUBLIC_APP_URL "https://botforge-beige.vercel.app"

# === SIZDAN KERAK — placeholder, build o‘tishi uchun ===
# Keyin bularni real qiymat bilan almashtirasiz
push TELEGRAM_BOT_TOKEN "000000000:placeholder_replace_via_botfather_xxxxxx"
push NEXT_PUBLIC_TELEGRAM_BOT_USERNAME "BotForgeBot"
push OPENAI_API_KEY "sk-placeholder_replace_with_real_key_xxxxxxx"

echo ""
echo "Tayyor. Endi: npx vercel deploy --prod --yes"
