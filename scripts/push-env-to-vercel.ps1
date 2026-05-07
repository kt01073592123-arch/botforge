# Vercel env vars (Neon versiyasi)
# powershell -ExecutionPolicy Bypass -File scripts/push-env-to-vercel.ps1

$ErrorActionPreference = "Stop"

# === SHU YERNI TO'LDIRING ===
$DATABASE_URL                  = "postgresql://USER:PASS@ep-xxx-pooler.REGION.aws.neon.tech/DB?sslmode=require"
$TELEGRAM_BOT_TOKEN            = "PASTE_BOTFATHER_TOKEN_FOR_PLATFORM_BOT"
$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "botforge_uz_bot"
$OPENAI_API_KEY                = "sk-PASTE_OPENAI_KEY"
$AI_MODEL                      = "gpt-4o-mini"
$ENCRYPTION_KEY                = "f5c10c87407649b3ecf6f509979d70af051d2f683c4ca1140c6b628d7df1afa2"
$WEBHOOK_SECRET                = "14995d4ef89fbfd217b3c8c00ea2b607182b0aa99c21e908"
$WEBHOOK_BASE_URL              = "https://botforge-beige.vercel.app"
$NEXT_PUBLIC_APP_URL           = "https://botforge-beige.vercel.app"
$CRON_SECRET                   = "GENERATE_NEW: node -e console.log(require('crypto').randomBytes(24).toString('hex'))"
# Click (ixtiyoriy)
$CLICK_SERVICE_ID              = ""
$CLICK_MERCHANT_ID             = ""
$CLICK_SECRET_KEY              = ""
# ============================

function Push-Env([string]$name, [string]$value) {
    if (-not $value -or $value -eq "") { Write-Host "  skip $name (bo'sh)" -ForegroundColor Yellow; return }
    Write-Host "+ $name" -ForegroundColor Cyan
    & npx vercel env rm $name production --yes 2>$null | Out-Null
    $value | & npx vercel env add $name production
}

Push-Env "DATABASE_URL"                      $DATABASE_URL
Push-Env "TELEGRAM_BOT_TOKEN"                $TELEGRAM_BOT_TOKEN
Push-Env "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME" $NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
Push-Env "OPENAI_API_KEY"                    $OPENAI_API_KEY
Push-Env "AI_MODEL"                          $AI_MODEL
Push-Env "ENCRYPTION_KEY"                    $ENCRYPTION_KEY
Push-Env "WEBHOOK_SECRET"                    $WEBHOOK_SECRET
Push-Env "WEBHOOK_BASE_URL"                  $WEBHOOK_BASE_URL
Push-Env "NEXT_PUBLIC_APP_URL"               $NEXT_PUBLIC_APP_URL
Push-Env "CRON_SECRET"                       $CRON_SECRET
Push-Env "CLICK_SERVICE_ID"                  $CLICK_SERVICE_ID
Push-Env "CLICK_MERCHANT_ID"                 $CLICK_MERCHANT_ID
Push-Env "CLICK_SECRET_KEY"                  $CLICK_SECRET_KEY

Write-Host ""
Write-Host "Endi: npx vercel deploy --prod --yes" -ForegroundColor Green
