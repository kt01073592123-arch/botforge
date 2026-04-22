import { registerAs } from '@nestjs/config'

// Centralised config factory — access via ConfigService.get('app.port') etc.
export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-in-prod',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    // One-time price in cents. Default $9.99.
    // Override with STRIPE_PRICE_CENTS env var.
    priceCents: parseInt(process.env.STRIPE_PRICE_CENTS ?? '999', 10),
    productName: process.env.STRIPE_PRODUCT_NAME ?? 'BotForge — Bot Builder Access',
  },

  // Set DISABLE_PAYMENTS=true to skip payment enforcement during development.
  // MUST be false (or unset) in production.
  disablePayments: process.env.DISABLE_PAYMENTS === 'true',

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  // AES-256-GCM key for BotSecret encryption.
  // Set BOT_SECRET_ENCRYPTION_KEY to any strong random string (e.g. openssl rand -base64 32).
  // REQUIRED — service will refuse to start without it if secrets are present.
  secretEncryptionKey: process.env.BOT_SECRET_ENCRYPTION_KEY ?? '',

  // OpenAI API key for AI-powered bot configuration
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
}))
