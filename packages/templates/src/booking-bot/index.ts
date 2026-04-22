import { z } from 'zod'
import type { TemplateDef, TemplateFile } from '../types'

// ── Zod schema ───────────────────────────────────────────────────────────────

export const bookingBotSchema = z.object({
  botToken: z.string().min(20).regex(/^\d+:[A-Za-z0-9_-]+$/),
  ownerChatId: z.string().min(1).regex(/^-?\d+$/),

  welcomeMessage: z.string().min(1).max(500),
  businessName: z.string().min(1).max(100),
  services: z.string().min(2, 'Add at least one service (JSON array)'),
  timeSlots: z.string().min(2, 'Add at least one time slot (JSON array)'),

  requireName: z.boolean().default(true),
  requirePhone: z.boolean().default(true),

  confirmationMessage: z.string().min(1).max(500),
})

export type BookingBotConfig = z.infer<typeof bookingBotSchema>

// ── Renderers ────────────────────────────────────────────────────────────────

function renderPackageJson(): string {
  return JSON.stringify(
    {
      name: 'booking-bot',
      version: '1.0.0',
      private: true,
      scripts: { build: 'tsc', start: 'node dist/bot.js', dev: 'ts-node src/bot.ts' },
      dependencies: { dotenv: '^16.4.5', telegraf: '^4.16.3' },
      devDependencies: { '@types/node': '^20.11.5', 'ts-node': '^10.9.2', typescript: '^5.3.3' },
    },
    null,
    2,
  )
}

function renderTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020', module: 'commonjs', lib: ['ES2020'],
        outDir: './dist', rootDir: './src', strict: true,
        esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  )
}

function renderEnvExample(): string {
  return '# Telegram bot token\nBOT_TOKEN=\n\n# Admin chat ID for booking notifications\nOWNER_CHAT_ID=\n'
}

function renderBotTs(cfg: BookingBotConfig): string {
  const welcome = JSON.stringify(cfg.welcomeMessage)
  const confirmation = JSON.stringify(cfg.confirmationMessage)
  const businessName = JSON.stringify(cfg.businessName)

  let services: string[] = []
  try { services = JSON.parse(cfg.services) } catch { /* validated upstream */ }
  let timeSlots: string[] = []
  try { timeSlots = JSON.parse(cfg.timeSlots) } catch { /* validated upstream */ }

  return `import 'dotenv/config'
import { Telegraf, Markup } from 'telegraf'

const BOT_TOKEN = process.env.BOT_TOKEN
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required')
if (!OWNER_CHAT_ID) throw new Error('OWNER_CHAT_ID is required')

const bot = new Telegraf(BOT_TOKEN)

// ── Config ───────────────────────────────────────────────────────────────────
const WELCOME = ${welcome}
const CONFIRMATION = ${confirmation}
const BUSINESS = ${businessName}
const REQUIRE_NAME = ${cfg.requireName}
const REQUIRE_PHONE = ${cfg.requirePhone}
const SERVICES: string[] = ${JSON.stringify(services)}
const TIME_SLOTS: string[] = ${JSON.stringify(timeSlots)}

// ── Session ──────────────────────────────────────────────────────────────────
type Step = 'idle' | 'select_service' | 'select_time' | 'awaiting_name' | 'awaiting_phone' | 'done'

interface Session {
  step: Step
  service?: string
  timeSlot?: string
  name?: string
  phone?: string
}

const sessions = new Map<number, Session>()
function getSession(uid: number): Session {
  if (!sessions.has(uid)) sessions.set(uid, { step: 'idle' })
  return sessions.get(uid)!
}

// ── Handlers ─────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  sessions.set(ctx.from.id, { step: 'select_service' })
  await ctx.reply(WELCOME)
  const buttons = SERVICES.map((s, i) => [Markup.button.callback(s, \`svc_\${i}\`)])
  await ctx.reply(\`\${BUSINESS} — xizmatni tanlang:\`, Markup.inlineKeyboard(buttons))
})

bot.action(/^svc_(\\d+)$/, async (ctx) => {
  const s = getSession(ctx.from.id)
  s.service = SERVICES[parseInt(ctx.match[1])]
  s.step = 'select_time'
  await ctx.answerCbQuery()
  const buttons = TIME_SLOTS.map((t, i) => [Markup.button.callback(t, \`time_\${i}\`)])
  await ctx.editMessageText(\`Tanlangan: \${s.service}\\n\\nVaqtni tanlang:\`, Markup.inlineKeyboard(buttons))
})

bot.action(/^time_(\\d+)$/, async (ctx) => {
  const s = getSession(ctx.from.id)
  s.timeSlot = TIME_SLOTS[parseInt(ctx.match[1])]
  await ctx.answerCbQuery()

  if (REQUIRE_NAME) {
    s.step = 'awaiting_name'
    await ctx.editMessageText(\`\${s.service} — \${s.timeSlot}\\n\\nIsmingizni kiriting:\`)
  } else if (REQUIRE_PHONE) {
    s.step = 'awaiting_phone'
    await ctx.reply('Telefon raqamingizni yuboring:', Markup.keyboard([[Markup.button.contactRequest('📱 Telefon yuborish')]]).resize().oneTime())
  } else {
    await finishBooking(ctx, s)
  }
})

async function finishBooking(ctx: any, s: Session) {
  s.step = 'done'
  await ctx.reply(CONFIRMATION, Markup.removeKeyboard())

  const lines = [
    \`📅 Yangi bron — \${BUSINESS}\`,
    '',
    \`Xizmat: \${s.service}\`,
    \`Vaqt: \${s.timeSlot}\`,
  ]
  if (s.name) lines.push(\`Ism: \${s.name}\`)
  if (s.phone) lines.push(\`Tel: \${s.phone}\`)
  lines.push(\`\\nTelegram: \${ctx.from.first_name} (@\${ctx.from.username || 'yo\\'q'})\`)

  try { await bot.telegram.sendMessage(OWNER_CHAT_ID!, lines.join('\\n')) }
  catch (e) { console.error('Failed to notify owner:', e) }
}

bot.on('contact', async (ctx) => {
  const s = getSession(ctx.from.id)
  if (s.step !== 'awaiting_phone') return
  s.phone = ctx.message.contact.phone_number
  await finishBooking(ctx, s)
})

bot.on('text', async (ctx) => {
  const s = getSession(ctx.from.id)
  if (s.step === 'awaiting_name') {
    s.name = ctx.message.text.trim()
    if (REQUIRE_PHONE) {
      s.step = 'awaiting_phone'
      await ctx.reply('Telefon raqamingizni yuboring:', Markup.keyboard([[Markup.button.contactRequest('📱 Telefon yuborish')]]).resize().oneTime())
    } else {
      await finishBooking(ctx, s)
    }
    return
  }
  if (s.step === 'idle' || s.step === 'done') await ctx.reply('/start bosing')
})

bot.launch({ dropPendingUpdates: true }).then(() => console.log('Booking bot running'))
  .catch((e) => { console.error('Launch failed:', e); process.exit(1) })
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
`
}

// ── Template definition ──────────────────────────────────────────────────────

export const bookingBotTemplate: TemplateDef = {
  metadata: {
    key: 'booking-bot',
    name: 'Booking Bot',
    description: "Let customers book appointments via Telegram. They pick a service, choose a time slot, and you get notified instantly.",
    category: 'Scheduling',
    isActive: true,
    isPaid: false,
    priceUsd: 0,
  },

  fields: [
    { name: 'botToken', type: 'password', label: 'Bot Token', description: 'Get from @BotFather', required: true },
    { name: 'ownerChatId', type: 'text', label: 'Admin Chat ID', description: 'Bookings will be forwarded here.', required: true },
    { name: 'businessName', type: 'text', label: 'Business Name', placeholder: 'My Barbershop', required: true, defaultValue: 'My Business' },
    { name: 'welcomeMessage', type: 'textarea', label: 'Welcome Message', required: true, maxLength: 500,
      defaultValue: "Assalomu alaykum! 👋 Xizmatimizga bron qilish uchun quyidagilarni tanlang." },
    { name: 'services', type: 'textarea', label: 'Services (JSON)', required: true, maxLength: 2000,
      placeholder: '["Soch olish","Soqol olish","Soch + Soqol"]',
      description: 'Service names as JSON array.',
      defaultValue: '["Xizmat 1","Xizmat 2","Xizmat 3"]' },
    { name: 'timeSlots', type: 'textarea', label: 'Time Slots (JSON)', required: true, maxLength: 2000,
      placeholder: '["09:00","10:00","11:00","14:00","15:00"]',
      description: 'Available time slots as JSON array.',
      defaultValue: '["09:00","10:00","11:00","14:00","15:00","16:00"]' },
    { name: 'requireName', type: 'boolean', label: 'Collect Name', required: false, defaultValue: true },
    { name: 'requirePhone', type: 'boolean', label: 'Collect Phone', required: false, defaultValue: true },
    { name: 'confirmationMessage', type: 'textarea', label: 'Confirmation Message', required: true, maxLength: 500,
      defaultValue: "Broningiz qabul qilindi! ✅ Belgilangan vaqtda kutamiz." },
  ],

  schema: bookingBotSchema,

  envMapping: {
    BOT_TOKEN: 'botToken',
    OWNER_CHAT_ID: 'ownerChatId',
  },

  getFiles(config: Record<string, unknown>): TemplateFile[] {
    const cfg = config as BookingBotConfig
    return [
      { path: 'package.json', content: renderPackageJson() },
      { path: 'tsconfig.json', content: renderTsConfig() },
      { path: '.env.example', content: renderEnvExample() },
      { path: 'src/bot.ts', content: renderBotTs(cfg) },
    ]
  },
}
