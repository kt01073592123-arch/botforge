# SETUP.md 5-bosqichini avtomatik bajaradigan script.
# Foydalanish: scriptni ochib pastdagi qiymatlarni to‘ldiring va ishga tushiring.
# powershell -ExecutionPolicy Bypass -File scripts/push-env-to-vercel.ps1

$ErrorActionPreference = "Stop"

# === SHU YERNI TO'LDIRING ===
$NEXT_PUBLIC_SUPABASE_URL      = "https://YOUR_PROJECT_REF.supabase.co"
$NEXT_PUBLIC_SUPABASE_ANON_KEY = "PASTE_ANON_KEY"
$SUPABASE_SERVICE_ROLE_KEY     = "PASTE_SERVICE_ROLE_KEY"
$TELEGRAM_BOT_TOKEN            = "PASTE_BOTFATHER_TOKEN_FOR_PLATFORM_BOT"
$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "botforge_uz_bot"
$OPENAI_API_KEY                = "sk-PASTE_OPENAI_KEY"
$AI_MODEL                      = "gpt-4o-mini"
$ENCRYPTION_KEY                = "f5c10c87407649b3ecf6f509979d70af051d2f683c4ca1140c6b628d7df1afa2"
$WEBHOOK_SECRET                = "14995d4ef89fbfd217b3c8c00ea2b607182b0aa99c21e908"
$WEBHOOK_BASE_URL              = "https://botforge-beige.vercel.app"
$NEXT_PUBLIC_APP_URL           = "https://botforge-beige.vercel.app"
# ============================

function Push-Env([string]$name, [string]$value) {
    Write-Host "→ $name" -ForegroundColor Cyan
    # avval mavjudini olib tashlash (xato bo‘lsa o‘tkazib yuboramiz)
    & npx vercel env rm $name production --yes 2>$null | Out-Null
    $value | & npx vercel env add $name production
}

Push-Env "NEXT_PUBLIC_SUPABASE_URL"      $NEXT_PUBLIC_SUPABASE_URL
Push-Env "NEXT_PUBLIC_SUPABASE_ANON_KEY" $NEXT_PUBLIC_SUPABASE_ANON_KEY
Push-Env "SUPABASE_SERVICE_ROLE_KEY"     $SUPABASE_SERVICE_ROLE_KEY
Push-Env "TELEGRAM_BOT_TOKEN"            $TELEGRAM_BOT_TOKEN
Push-Env "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME" $NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
Push-Env "OPENAI_API_KEY"                $OPENAI_API_KEY
Push-Env "AI_MODEL"                      $AI_MODEL
Push-Env "ENCRYPTION_KEY"                $ENCRYPTION_KEY
Push-Env "WEBHOOK_SECRET"                $WEBHOOK_SECRET
Push-Env "WEBHOOK_BASE_URL"              $WEBHOOK_BASE_URL
Push-Env "NEXT_PUBLIC_APP_URL"           $NEXT_PUBLIC_APP_URL

Write-Host ""
Write-Host "✅ Hammasi qo‘yildi. Endi: npx vercel deploy --prod --yes" -ForegroundColor Green
