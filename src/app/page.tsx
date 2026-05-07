// Landing — Telegram tashqaridan kelganlarga.

import Link from "next/link";

export default function Home() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "BotForgeBot";
  const tgLink = `https://t.me/${botUsername}`;

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-accent2/15 blur-3xl" />
      </div>

      <header className="px-6 py-5 max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2" />
          BotForge
        </div>
        <a
          href={tgLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !py-1.5"
        >
          Telegramda ochish
        </a>
      </header>

      {/* HERO */}
      <section className="px-6 pt-10 pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-panel text-xs text-muted mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Beauty salon va kosmetika biznesi uchun
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] mb-5 tracking-tight">
          Mijozga 24/7 javob beruvchi <br />
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            AI administrator bot
          </span>
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Mijoz yozsa AI javob beradi · xizmatni tushuntiradi · bron oladi · sizga
          Telegramda xabar yuboradi. <strong className="text-text">5 daqiqada</strong> ishga
          tushadi.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <a
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary !px-6 !py-3 !text-base"
          >
            Bepul boshlash →
          </a>
          <Link href="#how" className="btn-ghost !px-6 !py-3 !text-base">
            Qanday ishlaydi?
          </Link>
        </div>
        <div className="text-xs text-muted">
          ✓ Karta kiritmasdan · ✓ Barcha tariflar bekor qilinadi · ✓ O‘zbek tilida
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="px-6 max-w-5xl mx-auto pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">3 ta tayyor bot turi</h2>
        <p className="text-muted text-center mb-8">Biznesingizga mosini tanlang</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Card
            icon="💇"
            title="AI Beauty Manager"
            desc="Salon, kosmetolog, lash. Xizmatlar, narxlar, bron, ish vaqti."
            tags={["Eng mashhur", "Ko‘p so‘raladi"]}
          />
          <Card
            icon="📞"
            title="Lead Capture"
            desc="Reklamadan kelgan mijozdan ism, telefon yig‘adi va sizga uzatadi."
            tags={["Sotuvga"]}
          />
          <Card
            icon="🛟"
            title="Support FAQ"
            desc="Tipik savollarga javob beradi, javob topa olmasa operatorga uzatadi."
            tags={["Vaqt tejaydi"]}
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 max-w-3xl mx-auto pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">3 qadamda ishga tushadi</h2>
        <div className="space-y-3">
          <Step
            n={1}
            title="BotFather’dan token oling"
            desc="Telegramda @BotFather ga /newbot — 30 soniya."
          />
          <Step
            n={2}
            title="BotForge’ga tokenni qo‘ying"
            desc="Bot turini tanlang, biznes nomini va xizmatlarni yozing."
          />
          <Step
            n={3}
            title="Mijozlarga bot link’ini bering"
            desc="AI mijozga javob beradi, bron oladi, sizga lead yuboradi."
          />
        </div>
      </section>

      {/* WHY */}
      <section className="px-6 max-w-5xl mx-auto pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Nima uchun BotForge</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Why
            icon="⚡"
            title="5 daqiqada ishga tushadi"
            desc="No-code. Sozlash, dizayn, server kerak emas."
          />
          <Why
            icon="🇺🇿"
            title="O‘zbekcha biznes uchun"
            desc="Salon, kosmetika, restoran — kontekst tushunadi."
          />
          <Why
            icon="📞"
            title="Sizni Telegramda chaqiradi"
            desc="Mijoz operator so‘rasa darhol xabar olasiz."
          />
          <Why
            icon="📚"
            title="Bilim bazasi"
            desc="Mahsulot tavsifi, FAQ — AI shu bo‘yicha javob beradi."
          />
          <Why
            icon="🔐"
            title="Token shifrlangan"
            desc="AES-256-GCM. Hech kim ko‘ra olmaydi, hatto siz ham."
          />
          <Why
            icon="📊"
            title="Analytics + lead CRM"
            desc="Konversiya, kunlik trend, har bir lead status bilan."
          />
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 max-w-5xl mx-auto pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Tariflar</h2>
        <p className="text-muted text-center mb-8">
          Bepul’dan boshlang. Foydali bo‘lsa keyin yangilang.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Plan name="Free" price="0" desc="1 bot · 200 xabar/oy" features={["AI javob", "Lead capture"]} />
          <Plan
            name="Start"
            price="99 000"
            desc="1 bot · 3 000 xabar/oy"
            features={["+ Bilim bazasi", "+ Operator chat"]}
          />
          <Plan
            name="Pro"
            price="199 000"
            desc="5 bot · 20 000 xabar/oy"
            features={["+ Broadcast", "+ Analytics", "+ CRM"]}
            highlight
          />
          <Plan
            name="Max"
            price="399 000"
            desc="20 bot · 100 000 xabar/oy"
            features={["+ White-label", "+ Priority support"]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 max-w-3xl mx-auto pb-20 text-center">
        <h2 className="text-3xl font-bold mb-3">
          Hozir <span className="text-accent">bepul</span> sinab ko‘ring
        </h2>
        <p className="text-muted mb-6">
          5 daqiqa vaqtingizni oladi. Keyin yangidan mijozlar lead beradi.
        </p>
        <a
          href={tgLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !px-8 !py-3 !text-base"
        >
          Telegramda boshlash →
        </a>
      </section>

      <footer className="border-t border-border">
        <div className="px-6 py-6 max-w-5xl mx-auto text-xs text-muted flex flex-wrap justify-between gap-2">
          <span>© BotForge · Telegram WebApp</span>
          <div className="flex gap-3">
            <a href={tgLink} className="hover:text-text">Bot</a>
            <a href="https://t.me/BotFather" className="hover:text-text">BotFather</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Card({
  icon,
  title,
  desc,
  tags,
}: {
  icon: string;
  title: string;
  desc: string;
  tags?: string[];
}) {
  return (
    <div className="panel p-5 hover:border-accent transition">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-sm text-muted leading-snug mb-3">{desc}</div>
      {tags && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wider text-accent2 px-2 py-0.5 rounded-full bg-accent2/10 border border-accent2/30"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="panel p-4 flex gap-4">
      <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center font-bold flex-shrink-0">
        {n}
      </div>
      <div>
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-sm text-muted">{desc}</div>
      </div>
    </div>
  );
}

function Why({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="panel p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className="text-xs text-muted leading-relaxed">{desc}</div>
    </div>
  );
}

function Plan({
  name,
  price,
  desc,
  features,
  highlight,
}: {
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div className={`panel p-5 ${highlight ? "border-accent" : ""}`}>
      {highlight && (
        <div className="text-[10px] uppercase tracking-wider text-accent mb-2">Tavsiya</div>
      )}
      <div className="font-semibold text-base">{name}</div>
      <div className="text-2xl font-bold mt-1">
        {price === "0" ? "Bepul" : price}
        {price !== "0" && <span className="text-xs text-muted ml-1">so‘m/oy</span>}
      </div>
      <div className="text-xs text-muted mt-1 mb-3">{desc}</div>
      <ul className="text-xs text-muted space-y-1">
        {features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>
    </div>
  );
}
