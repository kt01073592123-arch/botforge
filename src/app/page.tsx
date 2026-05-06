// Landing — Telegram tashqaridan kelganlarga ko‘rsatiladi.
// Ichidan kelganlar /app ga avtomatik o‘tadi.

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2" />
          BotForge
        </div>
        <Link href="/app" className="btn-ghost">Kirish</Link>
      </header>

      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          5 daqiqada o‘z <span className="text-accent">AI manager bot</span>ingizni yarating
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto mb-8">
          Mijozga javob beradi · Bron oladi · Lead yig‘adi · Sizni Telegramda xabardor qiladi.
          Salon, kosmetika, do‘kon va biznes uchun.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/app" className="btn-primary">Boshlash</Link>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            BotFather
          </a>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mt-16">
        {[
          { t: "AI Beauty Manager", d: "Salon, kosmetolog, lash uchun" },
          { t: "Lead Capture", d: "Reklamadan kelgan mijozlardan ariza" },
          { t: "Support FAQ", d: "Tipik savollarga javob beruvchi bot" },
        ].map((c) => (
          <div key={c.t} className="panel p-5">
            <div className="text-base font-semibold mb-1">{c.t}</div>
            <div className="text-sm text-muted">{c.d}</div>
          </div>
        ))}
      </section>

      <footer className="mt-20 text-xs text-muted text-center">
        © BotForge · Telegram WebApp
      </footer>
    </main>
  );
}
