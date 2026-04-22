import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Universal Bot Config Schema
//
// This is the single source of truth for what a bot's configuration looks like.
// Every template uses a SUBSET of these sections.
//
// Three consumers:
//   1. Frontend form — renders fields from the template's ConfigField[] (unchanged)
//   2. Generator     — reads validated config to produce source files
//   3. Deploy worker — reads envMapping + secrets to build .env
//
// Flow:
//   User fills form → API validates with template's Zod schema →
//   stored as BotConfig.configData (plain) + BotSecret.secretData (encrypted) →
//   Generator merges both, validates again, calls getFiles(config) →
//   getFiles reads these typed sections to render source code
// ─────────────────────────────────────────────────────────────────────────────

// ── Bot type ─────────────────────────────────────────────────────────────────

export const BOT_TYPES = [
  'lead-capture',
  'order',
  'booking',
  'support',
  'faq',
  'ai-consultant',
] as const

export type BotType = typeof BOT_TYPES[number]

// ── Connection (every bot needs this) ────────────────────────────────────────

export const connectionSchema = z.object({
  botToken: z
    .string()
    .min(20, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid Telegram bot token format'),
  ownerChatId: z
    .string()
    .min(1, 'Chat ID is required')
    .regex(/^-?\d+$/, 'Chat ID must be a numeric value'),
})

export type ConnectionConfig = z.infer<typeof connectionSchema>

// ── Appearance ───────────────────────────────────────────────────────────────

export const appearanceSchema = z.object({
  welcomeMessage: z.string().min(1).max(1000).default('Assalomu alaykum! 👋'),
  language: z.enum(['uz', 'ru', 'en']).default('uz'),
})

export type AppearanceConfig = z.infer<typeof appearanceSchema>

// ── Menu ─────────────────────────────────────────────────────────────────────

export const menuItemSchema = z.object({
  label: z.string().min(1).max(100),
  action: z.enum(['flow', 'url', 'text']),
  /** flow name, URL, or static text depending on action type */
  value: z.string().min(1).max(2000),
})

export const menuSchema = z.object({
  enabled: z.boolean().default(false),
  items: z.array(menuItemSchema).default([]),
})

export type MenuItem = z.infer<typeof menuItemSchema>
export type MenuConfig = z.infer<typeof menuSchema>

// ── Collect fields (lead, order, booking) ────────────────────────────────────

export const collectFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1).max(100),
  type: z.enum(['text', 'email', 'phone', 'contact_share', 'number', 'select']),
  required: z.boolean().default(true),
  prompt: z.string().min(1).max(500),
  /** validation error shown to user */
  errorMessage: z.string().max(200).optional(),
  /** for select type */
  options: z.array(z.string()).optional(),
})

export const collectFieldsSchema = z.object({
  fields: z.array(collectFieldSchema).default([]),
  successMessage: z.string().min(1).max(500).default("Rahmat! ✅"),
})

export type CollectField = z.infer<typeof collectFieldSchema>
export type CollectFieldsConfig = z.infer<typeof collectFieldsSchema>

// ── Catalog (order bot) ──────────────────────────────────────────────────────

export const catalogItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  available: z.boolean().default(true),
})

export const catalogSchema = z.object({
  items: z.array(catalogItemSchema).min(1),
  currency: z.string().min(1).max(10).default('UZS'),
  minOrderAmount: z.number().min(0).default(0),
})

export type CatalogItem = z.infer<typeof catalogItemSchema>
export type CatalogConfig = z.infer<typeof catalogSchema>

// ── Booking (booking bot) ────────────────────────────────────────────────────

export const bookingSchema = z.object({
  businessName: z.string().min(1).max(100),
  services: z.array(z.string().min(1)).min(1),
  timeSlots: z.array(z.string().min(1)).min(1),
  confirmationMessage: z.string().min(1).max(500).default("Broningiz qabul qilindi! ✅"),
})

export type BookingConfig = z.infer<typeof bookingSchema>

// ── Support (support bot) ────────────────────────────────────────────────────

export const supportSchema = z.object({
  categories: z.array(z.string().min(1)).min(1),
  autoReplyEnabled: z.boolean().default(true),
  autoReplyMessage: z.string().max(500).default("Murojaatingiz qabul qilindi."),
  escalationMessage: z.string().min(1).max(500).default("Mutaxassis tez orada bog'lanadi."),
})

export type SupportConfig = z.infer<typeof supportSchema>

// ── Status workflow ──────────────────────────────────────────────────────────
// Defines how submissions (leads/orders/bookings/tickets) move through states.

export const statusStepSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1).max(50),
  notifyAdmin: z.boolean().default(false),
  notifyUser: z.boolean().default(false),
  userMessage: z.string().max(500).optional(),
})

export const statusWorkflowSchema = z.object({
  enabled: z.boolean().default(false),
  steps: z.array(statusStepSchema).default([]),
})

export type StatusStep = z.infer<typeof statusStepSchema>
export type StatusWorkflowConfig = z.infer<typeof statusWorkflowSchema>

// ── Admin settings ───────────────────────────────────────────────────────────

export const adminSettingsSchema = z.object({
  /** additional admin chat IDs (besides ownerChatId) */
  extraAdminIds: z.array(z.string()).default([]),
  /** enable /stats command */
  statsEnabled: z.boolean().default(false),
  /** enable /export command (CSV export of submissions) */
  exportEnabled: z.boolean().default(false),
  /** daily summary at this hour (0-23), null = disabled */
  dailySummaryHour: z.number().min(0).max(23).nullable().default(null),
})

export type AdminSettingsConfig = z.infer<typeof adminSettingsSchema>

// ── AI settings ──────────────────────────────────────────────────────────────

export const aiConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['openai', 'gemini']).default('openai'),
  apiKey: z.string().default(''),
  model: z.string().default(''),
  mode: z.enum(['faq', 'sales', 'support', 'consultant']).default('faq'),
  systemPrompt: z.string().max(2000).default(''),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(50).max(4000).default(500),
  fallbackMessage: z.string().max(500).default("Kechirasiz, hozir javob bera olmayapman."),
  fallbackToHuman: z.boolean().default(true),
  /** knowledge base entries for FAQ/support modes */
  knowledgeBase: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
  })).default([]),
})

export type AIConfig = z.infer<typeof aiConfigSchema>

// ── Universal bot config ─────────────────────────────────────────────────────
// Every template picks the sections it needs.
// Optional sections are nullable — a lead bot has no catalog, etc.

export const botConfigSchema = z.object({
  botType: z.enum(BOT_TYPES),

  // Every bot needs these
  connection: connectionSchema,
  appearance: appearanceSchema,

  // Template-specific sections (nullable = template doesn't use it)
  menu: menuSchema.nullable().default(null),
  collectFields: collectFieldsSchema.nullable().default(null),
  catalog: catalogSchema.nullable().default(null),
  booking: bookingSchema.nullable().default(null),
  support: supportSchema.nullable().default(null),
  statusWorkflow: statusWorkflowSchema.nullable().default(null),
  admin: adminSettingsSchema.nullable().default(null),
  ai: aiConfigSchema.nullable().default(null),
})

export type BotConfig = z.infer<typeof botConfigSchema>

// ── Section requirements per bot type ────────────────────────────────────────
// Maps each bot type to which sections are required, optional, or unused.
// Used by the generator to validate that all required sections are present.

export type SectionRequirement = 'required' | 'optional' | 'unused'

export interface BotTypeSpec {
  botType: BotType
  sections: {
    menu: SectionRequirement
    collectFields: SectionRequirement
    catalog: SectionRequirement
    booking: SectionRequirement
    support: SectionRequirement
    statusWorkflow: SectionRequirement
    admin: SectionRequirement
    ai: SectionRequirement
  }
}

export const BOT_TYPE_SPECS: Record<BotType, BotTypeSpec> = {
  'lead-capture': {
    botType: 'lead-capture',
    sections: {
      menu:           'unused',
      collectFields:  'required',
      catalog:        'unused',
      booking:        'unused',
      support:        'unused',
      statusWorkflow: 'optional',
      admin:          'optional',
      ai:             'unused',
    },
  },
  'order': {
    botType: 'order',
    sections: {
      menu:           'optional',
      collectFields:  'required',
      catalog:        'required',
      booking:        'unused',
      support:        'unused',
      statusWorkflow: 'optional',
      admin:          'optional',
      ai:             'optional',
    },
  },
  'booking': {
    botType: 'booking',
    sections: {
      menu:           'unused',
      collectFields:  'required',
      catalog:        'unused',
      booking:        'required',
      support:        'unused',
      statusWorkflow: 'optional',
      admin:          'optional',
      ai:             'unused',
    },
  },
  'support': {
    botType: 'support',
    sections: {
      menu:           'unused',
      collectFields:  'unused',
      catalog:        'unused',
      booking:        'unused',
      support:        'required',
      statusWorkflow: 'optional',
      admin:          'optional',
      ai:             'optional',
    },
  },
  'faq': {
    botType: 'faq',
    sections: {
      menu:           'optional',
      collectFields:  'unused',
      catalog:        'unused',
      booking:        'unused',
      support:        'unused',
      statusWorkflow: 'unused',
      admin:          'optional',
      ai:             'required',
    },
  },
  'ai-consultant': {
    botType: 'ai-consultant',
    sections: {
      menu:           'optional',
      collectFields:  'optional',
      catalog:        'unused',
      booking:        'unused',
      support:        'unused',
      statusWorkflow: 'unused',
      admin:          'optional',
      ai:             'required',
    },
  },
}

// ── Validation helper ────────────────────────────────────────────────────────

export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a BotConfig against its bot type's section requirements.
 * Call AFTER Zod validation passes — this checks structural completeness.
 */
export function validateConfigSections(config: BotConfig): ConfigValidationResult {
  const spec = BOT_TYPE_SPECS[config.botType]
  if (!spec) {
    return { valid: false, errors: [`Unknown bot type: ${config.botType}`] }
  }

  const errors: string[] = []
  const sections = spec.sections

  for (const [sectionName, requirement] of Object.entries(sections)) {
    if (requirement === 'required') {
      const value = config[sectionName as keyof BotConfig]
      if (value === null || value === undefined) {
        errors.push(`Section "${sectionName}" is required for ${config.botType} bots`)
      }
    }
  }

  // AI-specific: if AI is enabled, apiKey and systemPrompt must be set
  if (config.ai?.enabled) {
    if (!config.ai.apiKey) {
      errors.push('AI API key is required when AI is enabled')
    }
    if (!config.ai.systemPrompt) {
      errors.push('AI system prompt is required when AI is enabled')
    }
  }

  return { valid: errors.length === 0, errors }
}
