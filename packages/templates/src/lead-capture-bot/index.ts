import { z } from 'zod'
import type { TemplateDef, TemplateFile } from '../types'
import type { CollectField } from '@botforge/shared'
import { boilerplateFiles } from '../shared/render-boilerplate'
import { renderRouterTs } from '../shared/render-router'
import { renderStartFlowTs } from '../shared/render-start-flow'
import { renderFormFlowTs } from '../shared/render-form-flow'
import { renderAdminFlowTs } from '../shared/render-admin-flow'
import { renderNotifyTs } from '../shared/render-notify'
import { renderValidationTs } from '../shared/render-validation'
import { renderSessionTs } from '../shared/render-session'

// ── Schema ───────────────────────────────────────────────────────────────────

export const leadCaptureBotSchema = z.object({
  botToken: z.string().min(20).regex(/^\d+:[A-Za-z0-9_-]+$/),
  ownerChatId: z.string().min(1).regex(/^-?\d+$/),
  welcomeMessage: z.string().min(1).max(500),
  collectName: z.boolean().default(true),
  collectPhone: z.boolean().default(false),
  collectEmail: z.boolean().default(true),
  successMessage: z.string().min(1).max(500),
})

export type LeadCaptureBotConfig = z.infer<typeof leadCaptureBotSchema>

// ── Dynamic fields from config ───────────────────────────────────────────────

function buildCollectFields(cfg: LeadCaptureBotConfig): CollectField[] {
  const fields: CollectField[] = []
  if (cfg.collectName) fields.push({ key: 'fullName', label: 'Ism', type: 'text', required: true, prompt: 'Ismingizni kiriting:' })
  if (cfg.collectEmail) fields.push({ key: 'email', label: 'Email', type: 'email', required: true, prompt: 'Email manzilingizni kiriting:', errorMessage: "Email formati noto'g'ri" })
  if (cfg.collectPhone) fields.push({ key: 'phone', label: 'Telefon', type: 'contact_share', required: true, prompt: 'Telefon raqamingizni yuboring:' })
  return fields
}

// ── Template definition ──────────────────────────────────────────────────────

export const leadCaptureBotTemplate: TemplateDef = {
  metadata: {
    key: 'lead-capture-bot',
    name: 'Lead Capture Bot',
    description: 'Collect leads directly in Telegram. The bot greets visitors, gathers their contact info, and forwards every lead to your chat.',
    category: 'Marketing',
    isActive: true,
    isPaid: false,
    priceUsd: 0,
  },

  fields: [
    { name: 'botToken', type: 'password', label: 'Bot Token', description: 'Get from @BotFather', required: true },
    { name: 'ownerChatId', type: 'text', label: 'Your Chat ID', description: 'Leads will be forwarded here.', required: true },
    { name: 'welcomeMessage', type: 'textarea', label: 'Welcome Message', required: true, maxLength: 500, defaultValue: "Assalomu alaykum! 👋 Iltimos ma'lumotlaringizni qoldiring." },
    { name: 'collectName', type: 'boolean', label: 'Collect Name', required: false, defaultValue: true },
    { name: 'collectPhone', type: 'boolean', label: 'Collect Phone', required: false, defaultValue: false },
    { name: 'collectEmail', type: 'boolean', label: 'Collect Email', required: false, defaultValue: true },
    { name: 'successMessage', type: 'textarea', label: 'Thank-You Message', required: true, maxLength: 500, defaultValue: "Rahmat! Tez orada bog'lanamiz. 🎉" },
  ],

  schema: leadCaptureBotSchema,
  envMapping: { BOT_TOKEN: 'botToken', OWNER_CHAT_ID: 'ownerChatId' },

  getFiles(config: Record<string, unknown>): TemplateFile[] {
    const cfg = config as LeadCaptureBotConfig
    const fields = buildCollectFields(cfg)

    return [
      ...boilerplateFiles({
        name: 'lead-capture-bot',
        templateName: 'Lead Capture Bot',
        envMapping: this.envMapping,
        hasAI: false,
      }),
      { path: 'src/router.ts', content: renderRouterTs({ hasMenu: false, hasAdmin: true, hasStatusWorkflow: false, hasAI: false }) },
      { path: 'src/flows/start.flow.ts', content: renderStartFlowTs({ welcomeMessage: cfg.welcomeMessage, hasMenu: false }) },
      { path: 'src/flows/form.flow.ts', content: renderFormFlowTs(fields, cfg.successMessage, { hasAdmin: true, hasStatusWorkflow: false }) },
      { path: 'src/flows/admin.flow.ts', content: renderAdminFlowTs({ statsEnabled: true, exportEnabled: false, statusSteps: [] }) },
      { path: 'src/services/notify.ts', content: renderNotifyTs('📬 Yangi lead!') },
      { path: 'src/utils/validation.ts', content: renderValidationTs() },
      { path: 'src/utils/session.ts', content: renderSessionTs() },
    ]
  },
}
