import { z } from 'zod'
import type { TemplateDef, TemplateFile } from '../types'

// ── Zod schema ───────────────────────────────────────────────────────────────

export const supportBotSchema = z.object({
  botToken: z.string().min(20).regex(/^\d+:[A-Za-z0-9_-]+$/),
  ownerChatId: z.string().min(1).regex(/^-?\d+$/),

  welcomeMessage: z.string().min(1).max(500),
  categories: z.string().min(2, 'Add at least one category (JSON array)'),

  autoReplyEnabled: z.boolean().default(true),
  autoReplyMessage: z.string().max(500).default(''),
  escalationMessage: z.string().min(1).max(500),
})

export type SupportBotConfig = z.infer<typeof supportBotSchema>

// ── Renderers ────────────────────────────────────────────────────────────────

function renderPackageJson(): string {
  return JSON.stringify(
    {
      name: 'support-bot',
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
  return '# Telegram bot token\nBOT_TOKEN=\n\n# Support team chat ID\nOWNER_CHAT_ID=\n'
}

function renderBotTs(cfg: SupportBotConfig): string {
  const welcome = JSON.stringify(cfg.welcomeMessage)
  const escalation = JSON.stringify(cfg.escalationMessage)
  const autoReplyMsg = JSON.stringify(cfg.autoReplyMessage || "Murojaatingiz qabul qilindi. Tez orada javob beramiz!")

  let categories: string[] = []
  try { categories = JSON.parse(cfg.categories) } catch { /* validated upstream */ }

  return `import 'dotenv/config'
import { Telegraf, Markup } from 'telegraf'

const BOT_TOKEN = process.env.BOT_TOKEN
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required')
if (!OWNER_CHAT_ID) throw new Error('OWNER_CHAT_ID is required')

const bot = new Telegraf(BOT_TOKEN)

// ── Config ───────────────────────────────────────────────────────────────────
const WELCOME = ${welcome}
const ESCALATION_MSG = ${escalation}
const AUTO_REPLY_ENABLED = ${cfg.autoReplyEnabled}
const AUTO_REPLY_MSG = ${autoReplyMsg}
const CATEGORIES: string[] = ${JSON.stringify(categories)}

// ── Session ──────────────────────────────────────────────────────────────────
type Step = 'idle' | 'select_category' | 'awaiting_message'

interface Ticket {
  id: number
  userId: number
  username: string
  displayName: string
  category: string
  message: string
  createdAt: Date
}

interface Session {
  step: Step
  category?: string
}

const sessions = new Map<number, Session>()
const tickets: Ticket[] = []
let ticketCounter = 0

function getSession(uid: number): Session {
  if (!sessions.has(uid)) sessions.set(uid, { step: 'idle' })
  return sessions.get(uid)!
}

// ── Handlers ─────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  sessions.set(ctx.from.id, { step: 'select_category' })
  await ctx.reply(WELCOME)
  const buttons = CATEGORIES.map((c, i) => [Markup.button.callback(c, \`cat_\${i}\`)])
  await ctx.reply('Murojaat turini tanlang:', Markup.inlineKeyboard(buttons))
})

bot.action(/^cat_(\\d+)$/, async (ctx) => {
  const s = getSession(ctx.from.id)
  s.category = CATEGORIES[parseInt(ctx.match[1])]
  s.step = 'awaiting_message'
  await ctx.answerCbQuery()
  await ctx.editMessageText(\`Tanlangan: \${s.category}\\n\\nMurojaat matnini yozing:\`)
})

bot.on('text', async (ctx) => {
  const s = getSession(ctx.from.id)

  if (s.step === 'awaiting_message') {
    ticketCounter++
    const ticket: Ticket = {
      id: ticketCounter,
      userId: ctx.from.id,
      username: ctx.from.username || '',
      displayName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
      category: s.category || 'Umumiy',
      message: ctx.message.text.trim(),
      createdAt: new Date(),
    }
    tickets.push(ticket)

    // Notify user
    if (AUTO_REPLY_ENABLED) {
      await ctx.reply(\`\${AUTO_REPLY_MSG}\\n\\nMurojaat #\${ticket.id}\`)
    }

    // Forward to support team
    const lines = [
      \`🎫 Murojaat #\${ticket.id}\`,
      '',
      \`Turi: \${ticket.category}\`,
      \`Foydalanuvchi: \${ticket.displayName} (@\${ticket.username || 'yo\\'q'})\`,
      \`ID: \${ticket.userId}\`,
      '',
      ticket.message,
    ]

    try {
      await bot.telegram.sendMessage(OWNER_CHAT_ID!, lines.join('\\n'))
    } catch (e) {
      console.error('Failed to forward ticket:', e)
    }

    s.step = 'idle'
    return
  }

  // Not in a flow — show help
  if (s.step === 'idle') {
    await ctx.reply(ESCALATION_MSG + '\\n\\n/start — yangi murojaat yaratish')
  }
})

// Admin command: view recent tickets
bot.command('tickets', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  if (chatId !== OWNER_CHAT_ID) return

  const recent = tickets.slice(-10).reverse()
  if (recent.length === 0) {
    await ctx.reply('Hozircha murojaatlar yo\\'q.')
    return
  }

  const lines = recent.map(t =>
    \`#\${t.id} [\${t.category}] \${t.displayName}: \${t.message.slice(0, 50)}\${t.message.length > 50 ? '...' : ''}\`
  )
  await ctx.reply('Oxirgi murojaatlar:\\n\\n' + lines.join('\\n'))
})

bot.launch({ dropPendingUpdates: true }).then(() => console.log('Support bot running'))
  .catch((e) => { console.error('Launch failed:', e); process.exit(1) })
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
`
}

// ── Template definition ──────────────────────────────────────────────────────

export const supportBotTemplate: TemplateDef = {
  metadata: {
    key: 'support-bot',
    name: 'Support Bot',
    description: 'Handle customer support requests via Telegram. Users pick a category, describe their issue, and your support team gets notified instantly.',
    category: 'Support',
    isActive: true,
    isPaid: false,
    priceUsd: 0,
  },

  fields: [
    { name: 'botToken', type: 'password', label: 'Bot Token', description: 'Get from @BotFather', required: true },
    { name: 'ownerChatId', type: 'text', label: 'Support Chat ID', description: 'Tickets will be forwarded here. Can be a group chat ID.', required: true },
    { name: 'welcomeMessage', type: 'textarea', label: 'Welcome Message', required: true, maxLength: 500,
      defaultValue: "Assalomu alaykum! 👋 Qanday yordam bera olamiz?" },
    { name: 'categories', type: 'textarea', label: 'Categories (JSON)', required: true, maxLength: 2000,
      placeholder: '["Texnik muammo","To\'lov masalasi","Umumiy savol"]',
      description: 'Support categories as JSON array.',
      defaultValue: '["Texnik muammo","To\'lov masalasi","Taklif/Shikoyat","Boshqa"]' },
    { name: 'autoReplyEnabled', type: 'boolean', label: 'Auto-Reply', description: 'Send confirmation when ticket is received.', required: false, defaultValue: true },
    { name: 'autoReplyMessage', type: 'textarea', label: 'Auto-Reply Text', required: false, maxLength: 500,
      defaultValue: "Murojaatingiz qabul qilindi. Tez orada javob beramiz!" },
    { name: 'escalationMessage', type: 'textarea', label: 'Escalation Message', required: true, maxLength: 500,
      description: 'Shown when user sends a message outside a flow.',
      defaultValue: "Mutaxassis tez orada siz bilan bog'lanadi." },
  ],

  schema: supportBotSchema,

  envMapping: {
    BOT_TOKEN: 'botToken',
    OWNER_CHAT_ID: 'ownerChatId',
  },

  getFiles(config: Record<string, unknown>): TemplateFile[] {
    const cfg = config as SupportBotConfig
    return [
      { path: 'package.json', content: renderPackageJson() },
      { path: 'tsconfig.json', content: renderTsConfig() },
      { path: '.env.example', content: renderEnvExample() },
      { path: 'src/bot.ts', content: renderBotTs(cfg) },
    ]
  },
}
