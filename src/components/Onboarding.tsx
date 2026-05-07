"use client";

import Link from "next/link";

const STEPS: { n: number; title: string; desc: string }[] = [
  {
    n: 1,
    title: "BotFather’dan token oling",
    desc:
      "Telegramda @BotFather → /newbot → bot nomi va username (oxiri _bot bilan tugashi shart) → tokenni nusxalang",
  },
  {
    n: 2,
    title: "Bot turini tanlang",
    desc: "Beauty Manager, Lead Capture yoki Support FAQ — biznesingizga mosini tanlang",
  },
  {
    n: 3,
    title: "Xizmatlar va narxlarni kiriting",
    desc:
      "Ish vaqti, FAQ, aloqa — qancha to‘liq bo‘lsa, AI shuncha yaxshi javob beradi va xato qilmaydi",
  },
];

export default function Onboarding() {
  return (
    <div className="space-y-5">
      <div className="text-center py-3">
        <div className="text-4xl mb-2">✨</div>
        <h2 className="text-xl font-bold mb-1">Birinchi botingizni yaratamiz</h2>
        <p className="text-sm text-muted">3 qadamda — taxminan 5 daqiqa</p>
      </div>

      <div className="space-y-2">
        {STEPS.map((s) => (
          <div key={s.n} className="panel p-4 flex gap-3">
            <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
              {s.n}
            </div>
            <div>
              <div className="font-semibold text-sm mb-0.5">{s.title}</div>
              <div className="text-xs text-muted leading-snug">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
        >
          1. BotFather’ni ochish ↗
        </a>
        <Link href="/app/bots/new" className="btn-primary">
          2. Bot yaratishni boshlash →
        </Link>
      </div>

      <div className="panel p-4 text-xs text-muted leading-relaxed">
        <div className="font-semibold text-text mb-1.5">💡 Eslatma</div>
        BotForge tokeningizni faqat shifrlangan ko‘rinishda saqlaydi. AI mijozga javob beradi,
        bron oladi, lead yig‘adi va Telegramda sizga xabar yuboradi.
      </div>
    </div>
  );
}
