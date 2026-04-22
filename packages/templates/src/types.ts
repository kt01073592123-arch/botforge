import { z } from 'zod'

// ── Config field descriptor ───────────────────────────────────────────────────
// Serialisable — safe to send to the frontend for dynamic form rendering.

export type ConfigFieldType = 'text' | 'textarea' | 'password' | 'boolean' | 'url' | 'number' | 'select'

export interface ConfigField {
  name: string
  type: ConfigFieldType
  label: string
  placeholder?: string
  description?: string
  required: boolean
  maxLength?: number
  defaultValue?: string | boolean | number
  /** For 'select' type — the list of allowed values. */
  options?: Array<{ value: string; label: string }>
  /** For 'number' type — min/max bounds. */
  min?: number
  max?: number
}

// ── Template metadata ─────────────────────────────────────────────────────────
// Serialisable — sent as-is to the frontend.

export interface TemplateMetadata {
  key: string           // unique registry key, e.g. "lead-capture-bot"
  name: string
  description: string
  category: string
  isActive: boolean
  isPaid: boolean
  priceUsd: number      // in cents; 0 for free templates
}

// ── Template file descriptor ──────────────────────────────────────────────────

export interface TemplateFile {
  // Relative path inside the generated bot workspace, e.g. "src/bot.ts"
  path: string
  content: string
}

// ── Full template definition ──────────────────────────────────────────────────
// Kept in code (not the DB). Only the backend should import this directly;
// the frontend only ever sees TemplateMetadata + ConfigField[].

export interface TemplateDef {
  metadata: TemplateMetadata
  fields: ConfigField[]
  // Zod schema used server-side to validate configData before persistence.
  // Not sent to the client.
  schema: z.ZodSchema<unknown>
  // Maps env var name → config field name.
  // Used by the deploy worker to build the .env file from BotConfig.
  // Example: { 'BOT_TOKEN': 'botToken', 'OWNER_CHAT_ID': 'ownerChatId' }
  envMapping: Record<string, string>
  // Generates bot source files from validated config (Step 10+).
  getFiles?: (config: Record<string, unknown>) => TemplateFile[]
}
