import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="text-lg font-bold tracking-tight">BotForge</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Kirish
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            Boshlash
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-32 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-4 py-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          MVP — Faol ishlab chiqilmoqda
        </div>

        <h1 className="mb-5 text-5xl font-bold tracking-tight leading-tight sm:text-6xl">
          Telegram botlarni
          <span className="block text-indigo-400">kodsiz yarating</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-base text-gray-400 leading-relaxed">
          Shablon tanlang, forma to&apos;ldiring — BotForge sizga tayyor Telegram bot
          yaratib beradi. Bir necha daqiqada, haftalarsiz.
        </p>

        <Link
          href="/register"
          className="inline-flex rounded-lg bg-indigo-600 px-8 py-3.5 font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Birinchi botingizni yarating
        </Link>
      </section>

      {/* Templates */}
      <section className="mx-auto max-w-4xl px-6 pb-32">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '📬', title: 'Lead Bot', desc: "Mijozlar ma'lumotlarini yig'ing va adminga yuboring." },
            { icon: '🛒', title: 'Buyurtma Bot', desc: "Katalog, savat, buyurtma — to'liq savdo boti." },
            { icon: '📅', title: 'Bron Bot', desc: "Xizmat va vaqt tanlash, bron tasdiqlash." },
            { icon: '🛟', title: 'Yordam Bot', desc: "Murojaat qabul qilish, tiket yaratish, operatorga uzatish." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1.5 font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 pb-32">
        <h2 className="mb-8 text-center text-2xl font-bold">Qanday ishlaydi?</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { step: '1', title: 'Shablon tanlang', desc: "Lead, buyurtma, bron yoki yordam — o'zingizga kerakli botni tanlang." },
            { step: '2', title: 'Sozlang', desc: "Bot token, xush kelibsiz xabar, maydonlar — forma orqali sozlang." },
            { step: '3', title: 'Ishga tushiring', desc: "Bir tugma bilan bot yaratiladi va Telegramda ishlaydi." },
          ].map((f) => (
            <div key={f.step} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold">{f.step}</div>
              <h3 className="mb-1.5 font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
