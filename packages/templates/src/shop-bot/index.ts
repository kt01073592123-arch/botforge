import { z } from 'zod'
import type { TemplateDef, TemplateFile } from '../types'

// ── Zod schema ───────────────────────────────────────────────────────────────

export const shopBotSchema = z.object({
  botToken: z.string().min(20).regex(/^\d+:[A-Za-z0-9_-]+$/),
  adminChatId: z.string().min(1).regex(/^-?\d+$/),

  shopName: z.string().min(1).max(100),
  shopPhone: z.string().max(30).default(''),
  shopAddress: z.string().max(300).default(''),
  shopWorkingHours: z.string().max(50).default('09:00 - 21:00'),

  welcomeMessage: z.string().min(1).max(500),
  currency: z.string().min(1).max(10).default("so'm"),

  categories: z.string().min(2).refine(
    (v) => { try { const a = JSON.parse(v); return Array.isArray(a) && a.length > 0 } catch { return false } },
    'Kamida bitta kategoriya bo\'lgan JSON array kerak',
  ),
  products: z.string().min(2).refine(
    (v) => { try { const a = JSON.parse(v); return Array.isArray(a) && a.length > 0 } catch { return false } },
    'Kamida bitta mahsulot bo\'lgan JSON array kerak',
  ),

  enableSearch: z.boolean().default(true),
  paymentCash: z.boolean().default(true),
  paymentCard: z.boolean().default(true),
})

export type ShopBotConfig = z.infer<typeof shopBotSchema>

// ── Render helpers ───────────────────────────────────────────────────────────

function renderPackageJson(): string {
  return JSON.stringify(
    {
      name: 'shop-bot',
      version: '1.0.0',
      private: true,
      scripts: { build: 'tsc', start: 'node dist/bot.js', dev: 'ts-node src/bot.ts' },
      dependencies: {
        dotenv: '^16.4.5',
        telegraf: '^4.16.3',
        'better-sqlite3': '^11.3.0',
      },
      devDependencies: {
        '@types/better-sqlite3': '^7.6.8',
        '@types/node': '^20.11.5',
        'ts-node': '^10.9.2',
        typescript: '^5.3.3',
      },
    },
    null,
    2,
  )
}

function renderTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  )
}

function renderEnvExample(): string {
  return [
    '# Telegram bot token (@BotFather dan oling)',
    'BOT_TOKEN=',
    '',
    '# Admin Telegram ID (@userinfobot dan oling)',
    'ADMIN_CHAT_ID=',
    '',
  ].join('\n')
}

// ── Main bot file renderer ───────────────────────────────────────────────────

function renderBotTs(cfg: ShopBotConfig): string {
  // Parse config JSON
  let categories: Array<{ name: string; emoji?: string }> = []
  try { categories = JSON.parse(cfg.categories) } catch { /* validated */ }

  let products: Array<{
    category: string; name: string; price: number;
    description?: string; brand?: string; stock?: number;
    old_price?: number; sizes?: string; colors?: string;
  }> = []
  try { products = JSON.parse(cfg.products) } catch { /* validated */ }

  const categoriesLiteral = JSON.stringify(categories, null, 2)
  const productsLiteral = JSON.stringify(products, null, 2)

  // Build main menu rows
  const menuRows: string[] = []
  menuRows.push(`["🛍 Katalog", "🛒 Savat"]`)
  if (cfg.enableSearch) {
    menuRows.push(`["📦 Buyurtmalarim", "🔍 Qidirish"]`)
  } else {
    menuRows.push(`["📦 Buyurtmalarim"]`)
  }
  const infoRow: string[] = []
  if (cfg.shopPhone) infoRow.push(`"📞 Aloqa"`)
  infoRow.push(`"ℹ️ Ma'lumot"`)
  menuRows.push(`[${infoRow.join(', ')}]`)
  const mainMenuLiteral = menuRows.map((r) => `    ${r},`).join('\n')

  // Build payment buttons
  const paymentBtns: string[] = []
  if (cfg.paymentCash) {
    paymentBtns.push(`    [Markup.button.callback("💵 Naqd to'lov", "payment:cash")],`)
  }
  if (cfg.paymentCard) {
    paymentBtns.push(`    [Markup.button.callback("💳 Karta orqali", "payment:card")],`)
  }
  paymentBtns.push(`    [Markup.button.callback("❌ Bekor qilish", "cancel_order")],`)
  const paymentBtnsLiteral = paymentBtns.join('\n')

  // Escaped config values
  const shopName = JSON.stringify(cfg.shopName)
  const shopPhone = JSON.stringify(cfg.shopPhone || '')
  const shopAddress = JSON.stringify(cfg.shopAddress || '')
  const shopHours = JSON.stringify(cfg.shopWorkingHours || '09:00 - 21:00')
  const welcomeMsg = JSON.stringify(cfg.welcomeMessage)
  const currency = JSON.stringify(cfg.currency)

  // Conditional handler blocks
  const searchHandler = cfg.enableSearch
    ? `
// ── Qidirish ──────────────────────────────────────────────────────────────
bot.hears("🔍 Qidirish", (ctx) => {
  const s = getSession(ctx.from.id)
  s.step = "searching"
  ctx.reply("🔍 Qidirmoqchi bo'lgan mahsulot nomini yozing:")
})
`
    : ''

  const searchTextHandler = cfg.enableSearch
    ? `
  if (s.step === "searching") {
    s.step = "idle"
    const results = searchProducts(text)
    if (results.length === 0) {
      await ctx.reply("😕 Hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring.")
      return
    }
    await ctx.reply(
      \`🔍 <b>Natijalar:</b> \${results.length} ta topildi\`,
      { parse_mode: "HTML", ...productsKeyboard(results) },
    )
    return
  }
`
    : ''

  const contactHandler = cfg.shopPhone
    ? `
bot.hears("📞 Aloqa", (ctx) => {
  ctx.reply(
    "📞 <b>Biz bilan bog'lanish:</b>\\n\\n" +
    \`☎️ Telefon: \${SHOP_PHONE}\\n\` +
    \`📍 Manzil: \${SHOP_ADDRESS}\\n\` +
    \`🕐 Ish vaqti: \${SHOP_HOURS}\`,
    { parse_mode: "HTML" },
  )
})
`
    : ''

  return `import "dotenv/config"
import { Telegraf, Markup } from "telegraf"
import Database from "better-sqlite3"
import { join } from "path"

// ── Config ──────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID
if (!BOT_TOKEN) throw new Error("BOT_TOKEN topilmadi")
if (!ADMIN_CHAT_ID) throw new Error("ADMIN_CHAT_ID topilmadi")

const SHOP_NAME = ${shopName}
const SHOP_PHONE = ${shopPhone}
const SHOP_ADDRESS = ${shopAddress}
const SHOP_HOURS = ${shopHours}
const CURRENCY = ${currency}

const bot = new Telegraf(BOT_TOKEN)

// ── Database ────────────────────────────────────────────────────────────────
const db = new Database(join(__dirname, "..", "shop.db"))
db.pragma("journal_mode = WAL")

db.exec(\`
  CREATE TABLE IF NOT EXISTS users (
    user_id  INTEGER PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    phone    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    emoji TEXT DEFAULT '📦',
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    price       REAL NOT NULL,
    old_price   REAL,
    stock       INTEGER DEFAULT 0,
    sizes       TEXT DEFAULT '',
    colors      TEXT DEFAULT '',
    brand       TEXT DEFAULT '',
    is_active   INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );
  CREATE TABLE IF NOT EXISTS cart (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    product_id INTEGER,
    quantity   INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER,
    items          TEXT,
    total_price    REAL,
    address        TEXT,
    phone          TEXT,
    status         TEXT DEFAULT 'new',
    payment_method TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
  );
\`)

// ── Seed data ───────────────────────────────────────────────────────────────
const catCount = (db.prepare("SELECT COUNT(*) as c FROM categories").get() as any).c
if (catCount === 0) {
  const cats: Array<{ name: string; emoji?: string }> = ${categoriesLiteral}
  const ins = db.prepare("INSERT INTO categories (name, emoji) VALUES (?, ?)")
  for (const c of cats) ins.run(c.name, c.emoji || "📦")

  const prods: Array<{
    category: string; name: string; price: number;
    description?: string; brand?: string; stock?: number;
    old_price?: number; sizes?: string; colors?: string;
  }> = ${productsLiteral}

  const prodIns = db.prepare(
    "INSERT INTO products (category_id, name, description, price, old_price, stock, sizes, colors, brand) VALUES (?,?,?,?,?,?,?,?,?)",
  )
  for (const p of prods) {
    const cat = db.prepare("SELECT id FROM categories WHERE name = ?").get(p.category) as any
    if (cat) {
      prodIns.run(
        cat.id, p.name, p.description || "", p.price,
        p.old_price || null, p.stock || 0, p.sizes || "", p.colors || "", p.brand || "",
      )
    }
  }
  console.log(\`✅ \${cats.length} kategoriya, \${prods.length} mahsulot yuklandi\`)
}

// ── DB helpers ──────────────────────────────────────────────────────────────
function addUser(uid: number, username: string, fullName: string) {
  db.prepare("INSERT OR IGNORE INTO users (user_id, username, full_name) VALUES (?, ?, ?)").run(uid, username, fullName)
}

function getCategories(): any[] {
  return db.prepare("SELECT * FROM categories ORDER BY sort_order, id").all()
}

function getProducts(categoryId?: number): any[] {
  if (categoryId) return db.prepare("SELECT * FROM products WHERE is_active = 1 AND category_id = ?").all(categoryId)
  return db.prepare("SELECT * FROM products WHERE is_active = 1").all()
}

function getProduct(id: number): any {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id)
}

function searchProducts(query: string): any[] {
  const q = \`%\${query}%\`
  return db.prepare("SELECT * FROM products WHERE is_active = 1 AND (name LIKE ? OR description LIKE ? OR brand LIKE ?)").all(q, q, q)
}

function addToCart(userId: number, productId: number) {
  const existing = db.prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?").get(userId, productId) as any
  if (existing) db.prepare("UPDATE cart SET quantity = quantity + 1 WHERE id = ?").run(existing.id)
  else db.prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)").run(userId, productId)
}

function getCart(userId: number): any[] {
  return db.prepare(
    "SELECT c.id as cart_id, c.product_id, c.quantity, p.name, p.price, p.brand FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?",
  ).all(userId)
}

function removeFromCart(cartId: number) {
  db.prepare("DELETE FROM cart WHERE id = ?").run(cartId)
}

function clearCart(userId: number) {
  db.prepare("DELETE FROM cart WHERE user_id = ?").run(userId)
}

function createOrder(userId: number, items: string, total: number, address: string, phone: string, payment: string): number {
  const r = db.prepare("INSERT INTO orders (user_id, items, total_price, address, phone, payment_method) VALUES (?,?,?,?,?,?)").run(userId, items, total, address, phone, payment)
  return Number(r.lastInsertRowid)
}

function getUserOrders(userId: number): any[] {
  return db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all(userId)
}

function getOrder(orderId: number): any {
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId)
}

function updateOrderStatus(orderId: number, status: string) {
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId)
}

function updateUserPhone(userId: number, phone: string) {
  db.prepare("UPDATE users SET phone = ? WHERE user_id = ?").run(phone, userId)
}

function getUserPhone(userId: number): string | undefined {
  const u = db.prepare("SELECT phone FROM users WHERE user_id = ?").get(userId) as any
  return u?.phone || undefined
}

function getAllUsers(): any[] {
  return db.prepare("SELECT * FROM users").all()
}

// ── Session ─────────────────────────────────────────────────────────────────
type Step = "idle" | "awaiting_phone" | "awaiting_address" | "searching"

interface Session {
  step: Step
  phone?: string
  address?: string
}

const sessions = new Map<number, Session>()
function getSession(uid: number): Session {
  if (!sessions.has(uid)) sessions.set(uid, { step: "idle" })
  return sessions.get(uid)!
}

// ── Keyboards ───────────────────────────────────────────────────────────────
function mainMenu() {
  return Markup.keyboard([
${mainMenuLiteral}
  ]).resize()
}

function categoriesKeyboard(cats: any[]) {
  const buttons = cats.map((c: any) =>
    [Markup.button.callback(\`\${c.emoji || "📦"} \${c.name}\`, \`category:\${c.id}\`)],
  )
  buttons.push([Markup.button.callback("🔙 Orqaga", "back:main")])
  return Markup.inlineKeyboard(buttons)
}

function productsKeyboard(prods: any[], categoryId = 0, page = 0) {
  const perPage = 6
  const start = page * perPage
  const pageItems = prods.slice(start, start + perPage)

  const buttons = pageItems.map((p: any) =>
    [Markup.button.callback(\`\${p.name} — \${Number(p.price).toLocaleString()} \${CURRENCY}\`, \`product:\${p.id}\`)],
  )

  const nav: any[] = []
  if (page > 0) nav.push(Markup.button.callback("⬅️", \`page:\${categoryId}:\${page - 1}\`))
  if (start + perPage < prods.length) nav.push(Markup.button.callback("➡️", \`page:\${categoryId}:\${page + 1}\`))
  if (nav.length) buttons.push(nav)

  buttons.push([Markup.button.callback("📂 Kategoriyalar", "back:categories")])
  return Markup.inlineKeyboard(buttons)
}

function productDetailKeyboard(productId: number) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🛒 Savatga qo'shish", \`add_cart:\${productId}\`)],
    [Markup.button.callback("📂 Kategoriyalar", "back:categories")],
  ])
}

function cartKeyboard(items: any[]) {
  const buttons = items.map((it: any) =>
    [Markup.button.callback(\`❌ \${(it.name as string).slice(0, 25)}\`, \`remove_cart:\${it.cart_id}\`)],
  )
  if (items.length) {
    buttons.push([Markup.button.callback("✅ Buyurtma berish", "checkout")])
    buttons.push([Markup.button.callback("🗑 Savatni tozalash", "clear_cart")])
  }
  buttons.push([Markup.button.callback("🏠 Asosiy menyu", "back:main")])
  return Markup.inlineKeyboard(buttons)
}

function checkoutKeyboard() {
  return Markup.inlineKeyboard([
${paymentBtnsLiteral}
  ])
}

function contactKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest("📱 Telefon raqam yuborish")],
    ["❌ Bekor qilish"],
  ]).resize().oneTime()
}

function orderStatusKeyboard(orderId: number) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Qabul", \`status:\${orderId}:accepted\`),
      Markup.button.callback("🚗 Yo'lda", \`status:\${orderId}:shipping\`),
    ],
    [
      Markup.button.callback("✔️ Yetkazildi", \`status:\${orderId}:delivered\`),
      Markup.button.callback("❌ Bekor", \`status:\${orderId}:cancelled\`),
    ],
  ])
}

function adminKeyboard() {
  return Markup.keyboard([
    ["📊 Statistika", "📦 Buyurtmalar"],
    ["👥 Foydalanuvchilar"],
    ["🏠 Asosiy menyu"],
  ]).resize()
}

// ── /start ──────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const u = ctx.from
  addUser(u.id, u.username || "", u.full_name || u.first_name)
  const s = getSession(u.id)
  s.step = "idle"
  await ctx.reply(
    \`✨ Assalomu alaykum, <b>\${u.full_name || u.first_name}</b>!\\n\\n\` +
    ${welcomeMsg},
    { parse_mode: "HTML", ...mainMenu() },
  )
})

bot.help((ctx) =>
  ctx.reply(
    "<b>Yordam</b>\\n\\n" +
    "/start - Bosh menyu\\n" +
    "/help - Yordam\\n" +
    "/admin - Admin panel",
    { parse_mode: "HTML" },
  ),
)

// ── Asosiy menyu ────────────────────────────────────────────────────────────
bot.hears("ℹ️ Ma'lumot", (ctx) => {
  ctx.reply(
    \`🏪 <b>\${SHOP_NAME}</b>\\n\\n\` +
    (SHOP_ADDRESS ? \`📍 Manzil: \${SHOP_ADDRESS}\\n\` : "") +
    (SHOP_PHONE ? \`📞 Telefon: \${SHOP_PHONE}\\n\` : "") +
    \`🕐 Ish vaqti: \${SHOP_HOURS}\`,
    { parse_mode: "HTML" },
  )
})
${contactHandler}
// ── Katalog ─────────────────────────────────────────────────────────────────
bot.hears("🛍 Katalog", (ctx) => {
  const cats = getCategories()
  if (!cats.length) return ctx.reply("😕 Hozircha kategoriyalar mavjud emas.")
  ctx.reply("📂 <b>Kategoriyani tanlang:</b>", { parse_mode: "HTML", ...categoriesKeyboard(cats) })
})

bot.action(/^category:(\\d+)$/, async (ctx) => {
  const catId = parseInt(ctx.match[1])
  const prods = getProducts(catId)
  if (!prods.length) return ctx.answerCbQuery("Bu kategoriyada mahsulotlar yo'q", { show_alert: true })
  await ctx.editMessageText(\`🛍 <b>Mahsulotlar</b> (\${prods.length} ta):\`, { parse_mode: "HTML", ...productsKeyboard(prods, catId) })
  await ctx.answerCbQuery()
})

bot.action(/^page:(\\d+):(\\d+)$/, async (ctx) => {
  const catId = parseInt(ctx.match[1])
  const page = parseInt(ctx.match[2])
  const prods = catId ? getProducts(catId) : getProducts()
  await ctx.editMessageReplyMarkup(productsKeyboard(prods, catId, page).reply_markup)
  await ctx.answerCbQuery()
})

bot.action(/^product:(\\d+)$/, async (ctx) => {
  const prod = getProduct(parseInt(ctx.match[1]))
  if (!prod) return ctx.answerCbQuery("Mahsulot topilmadi", { show_alert: true })

  let text = \`<b>\${prod.name}</b>\\n\\n\`
  if (prod.brand) text += \`🏷 Brend: \${prod.brand}\\n\`
  text += \`💰 Narx: <b>\${Number(prod.price).toLocaleString()} \${CURRENCY}</b>\\n\`
  if (prod.old_price) text += \`<s>\${Number(prod.old_price).toLocaleString()} \${CURRENCY}</s> 🔥\\n\`
  if (prod.stock) text += \`📦 Mavjud: \${prod.stock} dona\\n\`
  if (prod.sizes) text += \`📏 O'lchamlar: \${prod.sizes}\\n\`
  if (prod.colors) text += \`🎨 Ranglar: \${prod.colors}\\n\`
  if (prod.description) text += \`\\n📝 \${prod.description}\\n\`

  await ctx.editMessageText(text, { parse_mode: "HTML", ...productDetailKeyboard(prod.id) })
  await ctx.answerCbQuery()
})

// ── Savat ───────────────────────────────────────────────────────────────────
bot.action(/^add_cart:(\\d+)$/, async (ctx) => {
  const prod = getProduct(parseInt(ctx.match[1]))
  if (!prod) return ctx.answerCbQuery("Mahsulot topilmadi", { show_alert: true })
  addToCart(ctx.from.id, prod.id)
  await ctx.answerCbQuery(\`✅ \${prod.name} savatga qo'shildi!\`, { show_alert: true })
})

bot.hears("🛒 Savat", (ctx) => {
  const items = getCart(ctx.from.id)
  if (!items.length) return ctx.reply("🛒 Savatingiz bo'sh.\\n\\n🛍 Katalog dan mahsulot tanlang.")

  const total = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0)
  let text = "🛒 <b>Sizning savatingiz:</b>\\n\\n"
  items.forEach((it: any, i: number) => {
    const sub = it.price * it.quantity
    text += \`\${i + 1}. <b>\${it.name}</b>\\n   \${it.quantity} x \${Number(it.price).toLocaleString()} = \${sub.toLocaleString()} \${CURRENCY}\\n\\n\`
  })
  text += \`💰 <b>Jami: \${total.toLocaleString()} \${CURRENCY}</b>\`
  ctx.reply(text, { parse_mode: "HTML", ...cartKeyboard(items) })
})

bot.action(/^remove_cart:(\\d+)$/, async (ctx) => {
  removeFromCart(parseInt(ctx.match[1]))
  await ctx.answerCbQuery("❌ O'chirildi")
  const items = getCart(ctx.from.id)
  if (!items.length) {
    await ctx.editMessageText("🛒 Savatingiz bo'sh.")
    return
  }
  const total = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0)
  let text = "🛒 <b>Sizning savatingiz:</b>\\n\\n"
  items.forEach((it: any, i: number) => {
    const sub = it.price * it.quantity
    text += \`\${i + 1}. <b>\${it.name}</b>\\n   \${it.quantity} x \${Number(it.price).toLocaleString()} = \${sub.toLocaleString()} \${CURRENCY}\\n\\n\`
  })
  text += \`💰 <b>Jami: \${total.toLocaleString()} \${CURRENCY}</b>\`
  await ctx.editMessageText(text, { parse_mode: "HTML", ...cartKeyboard(items) })
})

bot.action("clear_cart", async (ctx) => {
  clearCart(ctx.from.id)
  await ctx.editMessageText("🗑 Savat tozalandi.")
  await ctx.answerCbQuery()
})

// ── Buyurtma berish ─────────────────────────────────────────────────────────
bot.action("checkout", async (ctx) => {
  const items = getCart(ctx.from.id)
  if (!items.length) return ctx.answerCbQuery("Savat bo'sh!", { show_alert: true })
  await ctx.answerCbQuery()

  const s = getSession(ctx.from.id)
  const savedPhone = getUserPhone(ctx.from.id)
  if (savedPhone) {
    s.phone = savedPhone
    s.step = "awaiting_address"
    await ctx.reply(\`📱 Saqlangan telefon: <b>\${savedPhone}</b>\\n\\nManzilingizni yozing 📍\`, { parse_mode: "HTML" })
  } else {
    s.step = "awaiting_phone"
    await ctx.reply("📱 Telefon raqamingizni yuboring:", contactKeyboard())
  }
})

bot.on("contact", async (ctx) => {
  const s = getSession(ctx.from.id)
  if (s.step !== "awaiting_phone") return
  const phone = ctx.message.contact.phone_number
  s.phone = phone
  updateUserPhone(ctx.from.id, phone)
  s.step = "awaiting_address"
  await ctx.reply(\`✅ Telefon: \${phone}\\n\\nManzilingizni yozing 📍\`, Markup.removeKeyboard())
})

bot.action(/^payment:(\\w+)$/, async (ctx) => {
  const s = getSession(ctx.from.id)
  const method = ctx.match[1]
  const items = getCart(ctx.from.id)
  if (!items.length) return ctx.answerCbQuery("Savat bo'sh!", { show_alert: true })
  await ctx.answerCbQuery()

  const total = items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0)
  const itemsText = items.map((it: any) => \`  • \${it.name} x\${it.quantity} = \${(it.price * it.quantity).toLocaleString()} \${CURRENCY}\`).join("\\n")

  const orderId = createOrder(
    ctx.from.id,
    JSON.stringify(items.map((it: any) => ({ product_id: it.product_id, name: it.name, qty: it.quantity, price: it.price }))),
    total, s.address || "", s.phone || "", method,
  )

  clearCart(ctx.from.id)
  s.step = "idle"

  const payText = method === "cash" ? "💵 Naqd" : "💳 Karta"

  await ctx.deleteMessage().catch(() => {})
  await ctx.reply(
    \`✅ <b>Buyurtma #\${orderId} qabul qilindi!</b>\\n\\n\` +
    \`📦 <b>Mahsulotlar:</b>\\n\${itemsText}\\n\\n\` +
    \`💰 <b>Jami:</b> \${total.toLocaleString()} \${CURRENCY}\\n\` +
    \`💳 <b>To'lov:</b> \${payText}\\n\` +
    \`📍 <b>Manzil:</b> \${s.address || "-"}\\n\` +
    \`📱 <b>Telefon:</b> \${s.phone || "-"}\\n\\n\` +
    "Operatorimiz tez orada bog'lanadi! 🤝",
    { parse_mode: "HTML", ...mainMenu() },
  )

  // Admin xabar
  try {
    await bot.telegram.sendMessage(
      ADMIN_CHAT_ID!,
      \`🔔 <b>YANGI BUYURTMA #\${orderId}</b>\\n\\n\` +
      \`👤 \${ctx.from.full_name || ctx.from.first_name} (@\${ctx.from.username || "username yo'q"})\\n\` +
      \`📱 \${s.phone || "-"}\\n📍 \${s.address || "-"}\\n\\n\` +
      \`📦 <b>Mahsulotlar:</b>\\n\${itemsText}\\n\\n\` +
      \`💰 <b>Jami:</b> \${total.toLocaleString()} \${CURRENCY}\\n\` +
      \`💳 \${payText}\`,
      { parse_mode: "HTML", ...orderStatusKeyboard(orderId) },
    )
  } catch (e) { console.error("Admin xabar yuborishda xato:", e) }

  s.phone = undefined
  s.address = undefined
})

bot.action("cancel_order", async (ctx) => {
  const s = getSession(ctx.from.id)
  s.step = "idle"
  s.phone = undefined
  s.address = undefined
  await ctx.deleteMessage().catch(() => {})
  await ctx.reply("❌ Buyurtma bekor qilindi.", mainMenu())
  await ctx.answerCbQuery()
})

// ── Buyurtmalarim ───────────────────────────────────────────────────────────
bot.hears("📦 Buyurtmalarim", (ctx) => {
  const orders = getUserOrders(ctx.from.id)
  if (!orders.length) return ctx.reply("📭 Sizda hali buyurtmalar yo'q.")

  const statusEmoji: Record<string, string> = { new: "🔵", accepted: "✅", shipping: "🚗", delivered: "✔️", cancelled: "❌" }
  const statusName: Record<string, string> = { new: "Yangi", accepted: "Qabul qilingan", shipping: "Yo'lda", delivered: "Yetkazilgan", cancelled: "Bekor" }

  let text = "📦 <b>Buyurtmalaringiz:</b>\\n\\n"
  for (const o of orders.slice(0, 10)) {
    const emoji = statusEmoji[o.status] || "📦"
    const name = statusName[o.status] || o.status
    text += \`\${emoji} <b>#\${o.id}</b> — \${name}\\n   💰 \${Number(o.total_price).toLocaleString()} \${CURRENCY}\\n   📅 \${(o.created_at || "").slice(0, 16)}\\n\\n\`
  }
  ctx.reply(text, { parse_mode: "HTML" })
})
${searchHandler}
// ── Orqaga tugmalari ────────────────────────────────────────────────────────
bot.action("back:main", async (ctx) => {
  await ctx.deleteMessage().catch(() => {})
  await ctx.reply("🏠 Asosiy menyu", mainMenu())
  await ctx.answerCbQuery()
})

bot.action("back:categories", async (ctx) => {
  const cats = getCategories()
  await ctx.editMessageText("📂 <b>Kategoriyani tanlang:</b>", { parse_mode: "HTML", ...categoriesKeyboard(cats) }).catch(async () => {
    await ctx.deleteMessage().catch(() => {})
    await ctx.reply("📂 <b>Kategoriyani tanlang:</b>", { parse_mode: "HTML", ...categoriesKeyboard(cats) })
  })
  await ctx.answerCbQuery()
})

// ── Admin: buyurtma holati ──────────────────────────────────────────────────
bot.action(/^status:(\\d+):(\\w+)$/, async (ctx) => {
  if (String(ctx.from.id) !== ADMIN_CHAT_ID) return ctx.answerCbQuery("⛔️ Huquq yo'q!", { show_alert: true })

  const orderId = parseInt(ctx.match[1])
  const status = ctx.match[2]
  updateOrderStatus(orderId, status)

  const statusNames: Record<string, string> = {
    accepted: "✅ Qabul qilindi", shipping: "🚗 Yo'lda", delivered: "✔️ Yetkazildi", cancelled: "❌ Bekor qilindi",
  }
  const text = statusNames[status] || status

  await ctx.editMessageText(ctx.callbackQuery.message && "text" in ctx.callbackQuery.message ? ctx.callbackQuery.message.text + \`\\n\\n🔄 Holat: \${text}\` : \`Buyurtma #\${orderId}: \${text}\`, { parse_mode: "HTML" }).catch(() => {})

  const order = getOrder(orderId)
  if (order) {
    try {
      await bot.telegram.sendMessage(order.user_id, \`📦 Buyurtma <b>#\${orderId}</b> holati:\\n\\n<b>\${text}</b>\`, { parse_mode: "HTML" })
    } catch (e) { console.error("Mijozga xabar:", e) }
  }
  await ctx.answerCbQuery(\`Holat: \${text}\`)
})

// ── Admin panel ─────────────────────────────────────────────────────────────
bot.command("admin", (ctx) => {
  if (String(ctx.from.id) !== ADMIN_CHAT_ID) return ctx.reply("⛔️ Sizda admin huquqi yo'q!")
  ctx.reply("👨‍💼 <b>Admin paneli</b>", { parse_mode: "HTML", ...adminKeyboard() })
})

bot.hears("📊 Statistika", async (ctx) => {
  if (String(ctx.from.id) !== ADMIN_CHAT_ID) return

  const users = getAllUsers()
  const prods = getProducts()
  const orderStats = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total_price),0) as rev FROM orders").get() as any
  const todayStats = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total_price),0) as rev FROM orders WHERE date(created_at) = date('now')").get() as any

  await ctx.reply(
    "📊 <b>Statistika</b>\\n\\n" +
    \`👥 Foydalanuvchilar: <b>\${users.length}</b>\\n\` +
    \`📦 Mahsulotlar: <b>\${prods.length}</b>\\n\\n\` +
    \`🛒 <b>Buyurtmalar:</b>\\n\` +
    \`   Jami: <b>\${orderStats.cnt}</b>\\n\` +
    \`   Bugun: <b>\${todayStats.cnt}</b>\\n\\n\` +
    \`💰 <b>Daromad:</b>\\n\` +
    \`   Jami: <b>\${Number(orderStats.rev).toLocaleString()} \${CURRENCY}</b>\\n\` +
    \`   Bugun: <b>\${Number(todayStats.rev).toLocaleString()} \${CURRENCY}</b>\`,
    { parse_mode: "HTML" },
  )
})

bot.hears("📦 Buyurtmalar", async (ctx) => {
  if (String(ctx.from.id) !== ADMIN_CHAT_ID) return
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 20").all() as any[]
  if (!orders.length) return ctx.reply("📭 Buyurtmalar yo'q")

  const emoji: Record<string, string> = { new: "🔵", accepted: "✅", shipping: "🚗", delivered: "✔️", cancelled: "❌" }
  let text = "📦 <b>Oxirgi buyurtmalar:</b>\\n\\n"
  for (const o of orders) {
    text += \`\${emoji[o.status] || "📦"} <b>#\${o.id}</b> — \${Number(o.total_price).toLocaleString()} \${CURRENCY}\\n   📱 \${o.phone || "-"} | 📅 \${(o.created_at || "").slice(0, 16)}\\n\\n\`
  }
  ctx.reply(text, { parse_mode: "HTML" })
})

bot.hears("👥 Foydalanuvchilar", async (ctx) => {
  if (String(ctx.from.id) !== ADMIN_CHAT_ID) return
  const users = getAllUsers()
  let text = \`👥 <b>Foydalanuvchilar:</b> \${users.length} ta\\n\\n\`
  for (const u of users.slice(0, 20)) {
    const uname = u.username ? \`@\${u.username}\` : "username yo'q"
    text += \`• <b>\${u.full_name || "Nomalum"}</b>\\n  ID: <code>\${u.user_id}</code> | \${uname}\\n\`
  }
  if (users.length > 20) text += \`\\n<i>... va yana \${users.length - 20} ta</i>\`
  ctx.reply(text, { parse_mode: "HTML" })
})

bot.hears("🏠 Asosiy menyu", (ctx) => {
  const s = getSession(ctx.from.id)
  s.step = "idle"
  ctx.reply("🏠 Asosiy menyu", mainMenu())
})

// ── Text handler (order flow + search) ──────────────────────────────────────
bot.on("text", async (ctx) => {
  const s = getSession(ctx.from.id)
  const text = ctx.message.text.trim()

  if (text === "❌ Bekor qilish") {
    s.step = "idle"
    s.phone = undefined
    s.address = undefined
    await ctx.reply("❌ Bekor qilindi.", mainMenu())
    return
  }

  if (s.step === "awaiting_phone") {
    s.phone = text
    updateUserPhone(ctx.from.id, text)
    s.step = "awaiting_address"
    await ctx.reply(\`✅ Telefon: \${text}\\n\\nManzilingizni yozing 📍\`, Markup.removeKeyboard())
    return
  }

  if (s.step === "awaiting_address") {
    s.address = text
    await ctx.reply("💳 To'lov usulini tanlang:", checkoutKeyboard())
    return
  }
${searchTextHandler}
})

// ── Launch ──────────────────────────────────────────────────────────────────
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log(\`🤖 \${SHOP_NAME} bot ishga tushdi!\`)
  bot.telegram.sendMessage(ADMIN_CHAT_ID!, \`✅ <b>\${SHOP_NAME}</b> bot ishga tushdi!\`, { parse_mode: "HTML" }).catch(() => {})
}).catch((e) => { console.error("Launch xatosi:", e); process.exit(1) })

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
`
}

// ── Template definition ──────────────────────────────────────────────────────

export const shopBotTemplate: TemplateDef = {
  metadata: {
    key: 'shop-bot',
    name: "Do'kon Bot",
    description:
      "Telegram ichida to'liq ishlaydigan onlayn do'kon. Katalog, savat, buyurtma, to'lov, admin panel — hammasi tayyor.",
    category: 'Commerce',
    isActive: true,
    isPaid: false,
    priceUsd: 0,
  },

  fields: [
    {
      name: 'botToken', type: 'password', label: 'Bot Token',
      description: '@BotFather dan oling', required: true,
    },
    {
      name: 'adminChatId', type: 'text', label: 'Admin Chat ID',
      description: '@userinfobot dan oling. Buyurtmalar shu chatga yuboriladi.', required: true,
    },
    {
      name: 'shopName', type: 'text', label: "Do'kon nomi",
      required: true, defaultValue: "Mening Do'konim",
    },
    {
      name: 'shopPhone', type: 'text', label: 'Telefon raqam',
      required: false, defaultValue: '+998901234567',
    },
    {
      name: 'shopAddress', type: 'text', label: 'Manzil',
      required: false, defaultValue: '',
    },
    {
      name: 'shopWorkingHours', type: 'text', label: 'Ish vaqti',
      required: false, defaultValue: '09:00 - 21:00',
    },
    {
      name: 'welcomeMessage', type: 'textarea', label: 'Salomlashuv xabari',
      required: true, maxLength: 500,
      defaultValue:
        "Botimizga xush kelibsiz! 🛍\nMahsulotlarimizni ko'ring, savatga qo'shing va buyurtma bering.",
    },
    {
      name: 'currency', type: 'text', label: 'Valyuta',
      description: "Masalan: so'm, USD, RUB", required: true, defaultValue: "so'm",
    },
    {
      name: 'categories', type: 'textarea', label: 'Kategoriyalar (JSON)',
      required: true, maxLength: 5000,
      description: 'JSON array. Har bir element: {"name": "...", "emoji": "..."}',
      placeholder: '[{"name":"Kosmetika","emoji":"💄"},{"name":"Kiyim","emoji":"👗"}]',
      defaultValue:
        '[{"name":"Kosmetika","emoji":"💄"},{"name":"Kiyim","emoji":"👗"},{"name":"Poyabzal","emoji":"👟"}]',
    },
    {
      name: 'products', type: 'textarea', label: 'Mahsulotlar (JSON)',
      required: true, maxLength: 10000,
      description:
        'JSON array. Har bir element: {"category": "Kategoriya nomi", "name": "...", "price": 50000}. Qo\'shimcha: description, brand, stock, old_price, sizes, colors.',
      placeholder:
        '[{"category":"Kosmetika","name":"Krem","price":45000,"brand":"Nivea"}]',
      defaultValue:
        '[{"category":"Kosmetika","name":"Yuz kremi","price":45000,"brand":"Nivea","stock":50,"description":"Quruq teri uchun namlovchi krem"},{"category":"Kiyim","name":"Futbolka","price":95000,"brand":"Adidas","stock":30,"sizes":"M, L, XL","colors":"Oq, Qora"},{"category":"Poyabzal","name":"Krossovka","price":450000,"brand":"Nike","stock":20,"sizes":"38, 39, 40, 41, 42"}]',
    },
    {
      name: 'enableSearch', type: 'boolean', label: '🔍 Qidirish funksiyasi',
      required: false, defaultValue: true,
    },
    {
      name: 'paymentCash', type: 'boolean', label: "💵 Naqd to'lov",
      required: false, defaultValue: true,
    },
    {
      name: 'paymentCard', type: 'boolean', label: '💳 Karta orqali',
      required: false, defaultValue: true,
    },
  ],

  schema: shopBotSchema,

  envMapping: {
    BOT_TOKEN: 'botToken',
    ADMIN_CHAT_ID: 'adminChatId',
  },

  getFiles(config: Record<string, unknown>): TemplateFile[] {
    const cfg = config as ShopBotConfig
    return [
      { path: 'package.json', content: renderPackageJson() },
      { path: 'tsconfig.json', content: renderTsConfig() },
      { path: '.env.example', content: renderEnvExample() },
      { path: 'src/bot.ts', content: renderBotTs(cfg) },
    ]
  },
}
