import { z } from 'zod'
import type { TemplateDef, TemplateFile } from '../types'

// ── Zod schema ───────────────────────────────────────────────────────────────

const catalogItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

export const orderBotSchema = z.object({
  botToken: z.string().min(20).regex(/^\d+:[A-Za-z0-9_-]+$/),
  ownerChatId: z.string().min(1).regex(/^-?\d+$/),

  welcomeMessage: z.string().min(1).max(500),
  currency: z.string().min(1).max(10).default('UZS'),
  catalog: z.string().min(2, 'Add at least one product (JSON array)'),

  requireName: z.boolean().default(true),
  requirePhone: z.boolean().default(true),
  requireAddress: z.boolean().default(false),

  confirmationMessage: z.string().min(1).max(500),
})

export type OrderBotConfig = z.infer<typeof orderBotSchema>

// ── Shared renderers ─────────────────────────────────────────────────────────

function renderPackageJson(): string {
  return JSON.stringify(
    {
      name: 'order-bot',
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
  return '# Telegram bot token\nBOT_TOKEN=\n\n# Admin chat ID for order notifications\nOWNER_CHAT_ID=\n'
}

function renderBotTs(cfg: OrderBotConfig): string {
  const welcome = JSON.stringify(cfg.welcomeMessage)
  const confirmation = JSON.stringify(cfg.confirmationMessage)
  const currency = JSON.stringify(cfg.currency)

  // Parse catalog JSON string to embed it
  let catalogItems: Array<{ name: string; price: number }> = []
  try { catalogItems = JSON.parse(cfg.catalog) } catch { /* validated upstream */ }
  const catalogLiteral = JSON.stringify(catalogItems, null, 2)

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
const CURRENCY = ${currency}
const REQUIRE_NAME = ${cfg.requireName}
const REQUIRE_PHONE = ${cfg.requirePhone}
const REQUIRE_ADDRESS = ${cfg.requireAddress}

interface CatalogItem { name: string; price: number }
const CATALOG: CatalogItem[] = ${catalogLiteral}

// ── Session ──────────────────────────────────────────────────────────────────
interface CartItem { item: CatalogItem; qty: number }
type Step = 'menu' | 'awaiting_name' | 'awaiting_phone' | 'awaiting_address' | 'confirm'

interface Session {
  step: Step
  cart: CartItem[]
  name?: string
  phone?: string
  address?: string
}

const sessions = new Map<number, Session>()
function getSession(uid: number): Session {
  if (!sessions.has(uid)) sessions.set(uid, { step: 'menu', cart: [] })
  return sessions.get(uid)!
}

// ── Menu ─────────────────────────────────────────────────────────────────────
function catalogKeyboard() {
  const buttons = CATALOG.map((item, i) =>
    [Markup.button.callback(\`\${item.name} — \${item.price} \${CURRENCY}\`, \`add_\${i}\`)]
  )
  buttons.push([Markup.button.callback('🛒 Buyurtma berish', 'checkout')])
  return Markup.inlineKeyboard(buttons)
}

function cartSummary(cart: CartItem[]): string {
  if (cart.length === 0) return 'Savat bo\\'sh'
  const lines = cart.map(c => \`  \${c.item.name} x\${c.qty} = \${c.item.price * c.qty} \${CURRENCY}\`)
  const total = cart.reduce((s, c) => s + c.item.price * c.qty, 0)
  return lines.join('\\n') + \`\\n\\nJami: \${total} \${CURRENCY}\`
}

// ── Handlers ─────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const s = getSession(ctx.from.id)
  s.step = 'menu'
  s.cart = []
  await ctx.reply(WELCOME)
  await ctx.reply('Mahsulotni tanlang:', catalogKeyboard())
})

bot.action(/^add_(\\d+)$/, async (ctx) => {
  const idx = parseInt(ctx.match[1])
  const item = CATALOG[idx]
  if (!item) return ctx.answerCbQuery('Topilmadi')
  const s = getSession(ctx.from.id)
  const existing = s.cart.find(c => c.item.name === item.name)
  if (existing) existing.qty++
  else s.cart.push({ item, qty: 1 })
  await ctx.answerCbQuery(\`\${item.name} qo'shildi\`)
  await ctx.editMessageText('Mahsulotni tanlang:\\n\\n' + cartSummary(s.cart), catalogKeyboard())
})

bot.action('checkout', async (ctx) => {
  const s = getSession(ctx.from.id)
  if (s.cart.length === 0) return ctx.answerCbQuery('Savat bo\\'sh!')
  await ctx.answerCbQuery()

  if (REQUIRE_NAME) {
    s.step = 'awaiting_name'
    await ctx.reply('Ismingizni kiriting:')
  } else if (REQUIRE_PHONE) {
    s.step = 'awaiting_phone'
    await ctx.reply('Telefon raqamingizni yuboring:', Markup.keyboard([[Markup.button.contactRequest('📱 Telefon yuborish')]]).resize().oneTime())
  } else if (REQUIRE_ADDRESS) {
    s.step = 'awaiting_address'
    await ctx.reply('Manzilingizni kiriting:')
  } else {
    await finishOrder(ctx, s)
  }
})

async function finishOrder(ctx: any, s: Session) {
  s.step = 'menu'
  await ctx.reply(CONFIRMATION, Markup.removeKeyboard())

  const lines = ['📦 Yangi buyurtma!', '', cartSummary(s.cart)]
  if (s.name) lines.push(\`Ism: \${s.name}\`)
  if (s.phone) lines.push(\`Tel: \${s.phone}\`)
  if (s.address) lines.push(\`Manzil: \${s.address}\`)
  lines.push(\`\\nTelegram: \${ctx.from.first_name} (@\${ctx.from.username || 'username yo\\'q'})\`)

  try { await bot.telegram.sendMessage(OWNER_CHAT_ID!, lines.join('\\n')) }
  catch (e) { console.error('Failed to notify owner:', e) }

  s.cart = []
  s.name = undefined
  s.phone = undefined
  s.address = undefined
}

bot.on('contact', async (ctx) => {
  const s = getSession(ctx.from.id)
  if (s.step !== 'awaiting_phone') return
  s.phone = ctx.message.contact.phone_number
  if (REQUIRE_ADDRESS) { s.step = 'awaiting_address'; await ctx.reply('Manzilingizni kiriting:', Markup.removeKeyboard()) }
  else await finishOrder(ctx, s)
})

bot.on('text', async (ctx) => {
  const s = getSession(ctx.from.id)
  if (s.step === 'awaiting_name') {
    s.name = ctx.message.text.trim()
    if (REQUIRE_PHONE) { s.step = 'awaiting_phone'; await ctx.reply('Telefon raqamingizni yuboring:', Markup.keyboard([[Markup.button.contactRequest('📱 Telefon yuborish')]]).resize().oneTime()) }
    else if (REQUIRE_ADDRESS) { s.step = 'awaiting_address'; await ctx.reply('Manzilingizni kiriting:') }
    else await finishOrder(ctx, s)
    return
  }
  if (s.step === 'awaiting_address') {
    s.address = ctx.message.text.trim()
    await finishOrder(ctx, s)
    return
  }
  if (s.step === 'menu') await ctx.reply('/start bosing')
})

bot.launch({ dropPendingUpdates: true }).then(() => console.log('Order bot running'))
  .catch((e) => { console.error('Launch failed:', e); process.exit(1) })
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
`
}

// ── Template definition ──────────────────────────────────────────────────────

export const orderBotTemplate: TemplateDef = {
  metadata: {
    key: 'order-bot',
    name: 'Order Bot',
    description: 'Accept orders via Telegram. Customers browse a catalog, add items to cart, and submit orders that get forwarded to your admin chat.',
    category: 'Commerce',
    isActive: true,
    isPaid: false,
    priceUsd: 0,
  },

  fields: [
    { name: 'botToken', type: 'password', label: 'Bot Token', description: 'Get from @BotFather', required: true },
    { name: 'ownerChatId', type: 'text', label: 'Admin Chat ID', description: 'Orders will be forwarded here.', required: true },
    { name: 'welcomeMessage', type: 'textarea', label: 'Welcome Message', required: true, maxLength: 500,
      defaultValue: "Assalomu alaykum! 👋 Buyurtma berish uchun mahsulotni tanlang." },
    { name: 'currency', type: 'text', label: 'Currency', description: 'e.g. UZS, USD, RUB', required: true, defaultValue: 'UZS' },
    { name: 'catalog', type: 'textarea', label: 'Catalog (JSON)', required: true, maxLength: 5000,
      placeholder: '[{"name":"Lavash","price":25000},{"name":"Shaurma","price":30000}]',
      description: 'Product list as JSON array. Each item needs "name" and "price".',
      defaultValue: '[{"name":"Mahsulot 1","price":10000},{"name":"Mahsulot 2","price":20000}]' },
    { name: 'requireName', type: 'boolean', label: 'Collect Name', required: false, defaultValue: true },
    { name: 'requirePhone', type: 'boolean', label: 'Collect Phone', required: false, defaultValue: true },
    { name: 'requireAddress', type: 'boolean', label: 'Collect Address', required: false, defaultValue: false },
    { name: 'confirmationMessage', type: 'textarea', label: 'Confirmation Message', required: true, maxLength: 500,
      defaultValue: "Buyurtmangiz qabul qilindi! ✅ Tez orada bog'lanamiz." },
  ],

  schema: orderBotSchema,

  envMapping: {
    BOT_TOKEN: 'botToken',
    OWNER_CHAT_ID: 'ownerChatId',
  },

  getFiles(config: Record<string, unknown>): TemplateFile[] {
    const cfg = config as OrderBotConfig
    return [
      { path: 'package.json', content: renderPackageJson() },
      { path: 'tsconfig.json', content: renderTsConfig() },
      { path: '.env.example', content: renderEnvExample() },
      { path: 'src/bot.ts', content: renderBotTs(cfg) },
    ]
  },
}
