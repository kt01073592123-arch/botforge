// Test environment — env vars'ni testdan oldin to'ldirish.
// Bu env() validation o'tishi uchun kerak.

import crypto from "node:crypto";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://test:test@localhost/test";
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "1234567890:TEST_TOKEN_FOR_VITEST_ONLY";
process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "test_bot";
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ?? crypto.randomBytes(32).toString("hex");
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "sk-ant-test";
process.env.AI_MODEL = process.env.AI_MODEL ?? "claude-haiku-4-5";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://test.local";
process.env.WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL ?? "https://test.local";
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test_webhook_secret_minimum_16ch";
