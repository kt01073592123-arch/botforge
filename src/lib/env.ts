// Markazlashtirilgan env validation. Loyihaning hamma joyida shu yerdan o‘qiydi.

import { z } from "zod";

const ServerEnvSchema = z.object({
  // Neon (yoki har qanday Postgres) connection string
  DATABASE_URL: z.string().url(),

  // Telegram platforma boti — WebApp login uchun
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(3),

  // 32 baytlik hex (openssl rand -hex 32)
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY 64 hex char (32 bayt) bo‘lishi kerak"),

  // OpenAI
  OPENAI_API_KEY: z.string().min(10),
  AI_MODEL: z.string().default("gpt-4o-mini"),

  // Public
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WEBHOOK_BASE_URL: z.string().url(),
  WEBHOOK_SECRET: z.string().min(16),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Yetishmayotgan/noto‘g‘ri env vars:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const publicEnv = {
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
};
