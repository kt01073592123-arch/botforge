"use client";

// Storefront — bot egasiga "Beauty Shop" (BeautyShop tipidagi) WebApp linkini ko'rsatadi.
// Faqat ulanish + sozlama ko'rsatma. Saytning o'zi ma'lumotlardan avtomatik yasaladi.

import { useEffect, useState } from "react";

type BotInfo = {
  id: string;
  name: string;
  business_name: string | null;
  tg_username: string | null;
  status: string;
};

export default function StorefrontPage({ params }: { params: { id: string } }) {
  const [bot, setBot] = useState<BotInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch(`/api/bots/${params.id}`)
      .then((r) => r.json())
      .then((d) => setBot(d.bot ?? null))
      .catch(() => {});
  }, [params.id]);

  if (!bot) return <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>;
  if (!bot.tg_username) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-5">
          <h2 className="font-bold text-yellow-900">Bot ulanmagan</h2>
          <p className="text-sm text-yellow-800 mt-1">
            Avval botingizni faollashtiring (token + webhook). Keyin shop sahifasi avtomatik ishga tushadi.
          </p>
        </div>
      </div>
    );
  }

  const shopUrl = `${appUrl}/shop/${bot.tg_username}`;
  const tgWebAppUrl = `https://t.me/${bot.tg_username}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🛍 Storefront — Beauty Shop sayti</h1>
        <p className="text-sm text-gray-500 mt-1">
          Mijozlaringiz uchun to'liq do'kon WebApp'i. Mahsulotlar, savat, buyurtma — hammasi ishlaydi.
        </p>
      </div>

      {/* URL card */}
      <div className="border rounded-lg p-5 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-xs uppercase font-semibold text-gray-600 mb-2">Sayt manzili</div>
        <div className="flex gap-2 items-center">
          <input
            readOnly
            value={shopUrl}
            className="flex-1 border rounded px-3 py-2 text-sm font-mono bg-white"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => copy(shopUrl)}
            className="px-3 py-2 bg-pink-500 text-white rounded text-sm font-semibold"
          >
            {copied ? "✓" : "📋"} Nusxa
          </button>
          <a
            href={shopUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-gray-900 text-white rounded text-sm font-semibold"
          >
            ↗ Ko'rish
          </a>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          💡 Bu URL'ni mijozlaringizga yuboring, yoki Telegram bot menyusiga "WebApp" tugmasi sifatida ulang.
        </div>
      </div>

      {/* Auto-filled info */}
      <div className="border rounded-lg p-5 bg-white">
        <h2 className="font-bold mb-3">📦 Avtomatik to'ldiriladigan ma'lumotlar</h2>
        <p className="text-sm text-gray-600 mb-4">
          Saytning dizayni va kontenti quyidagilardan avtomatik yasaladi:
        </p>
        <div className="space-y-2 text-sm">
          <Row label="Do'kon nomi" value={bot.business_name ?? bot.name} editLink={`/app/bots/${params.id}/settings`} />
          <Row label="Mahsulotlar / xizmatlar" value="services jadvali" editLink={`/app/bots/${params.id}/services`} />
          <Row label="Manzil + telefon + Instagram" value="contacts" editLink={`/app/bots/${params.id}/settings`} />
          <Row label="Ish vaqti" value="working_hours" editLink={`/app/bots/${params.id}/settings`} />
          <Row label="FAQ" value="faq" editLink={`/app/bots/${params.id}/settings`} />
          <Row label="Rang sxemasi (4 preset yoki custom)" value="theme" editLink={`/app/bots/${params.id}/theme`} />
          <Row label="AI Design (hero rasm + matnlar)" value="design_kit" editLink={`/app/bots/${params.id}/design`} />
        </div>
      </div>

      {/* Setup steps */}
      <div className="border rounded-lg p-5 bg-white">
        <h2 className="font-bold mb-3">🚀 Telegram'da WebApp tugmasini sozlash</h2>
        <ol className="space-y-3 text-sm text-gray-700 list-decimal pl-5">
          <li>
            BotFather'ga <code className="bg-gray-100 px-1 rounded">/setmenubutton</code> yozing va botingizni tanlang.
          </li>
          <li>
            URL: <code className="bg-gray-100 px-1 rounded text-xs">{shopUrl}</code>
            <button
              onClick={() => copy(shopUrl)}
              className="ml-2 text-xs text-blue-500 hover:underline"
            >
              [nusxa]
            </button>
          </li>
          <li>Tugma matni: <code className="bg-gray-100 px-1 rounded">🛍 Do'kon</code> yoki <code className="bg-gray-100 px-1 rounded">🛒 Sotib olish</code></li>
          <li>
            Telegramda <a href={tgWebAppUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">{tgWebAppUrl}</a> ga kirib tugmani bosib sinab ko'ring.
          </li>
        </ol>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <Feature icon="🛒" title="Savat" desc="Mahsulotlarni qo'shish, sonini o'zgartirish, lokal saqlash" />
        <Feature icon="🔍" title="Qidiruv + Kategoriya" desc="Mijoz nom yoki kategoriya bo'yicha filtrlaydi" />
        <Feature icon="❤️" title="Sevimlilar" desc="Mijoz yoqtirgan mahsulotlarni belgilab qo'yadi" />
        <Feature icon="📋" title="Buyurtma tarixi" desc="Mijoz oldingi buyurtmalarini ko'radi (lokal)" />
        <Feature icon="✅ Checkout" title="Buyurtma berish" desc="Ism, telefon, manzil → bot egasiga Telegram'da xabar" />
        <Feature icon="📱" title="Mobile-first" desc="BeautyShop strukturasi asosida — Telegram WebApp'ga ideal" />
        <Feature icon="🎨" title="Avtomatik dizayn" desc="Brand kit ranglari va emoji avtomatik qo'llaniladi" />
        <Feature icon="🌐" title="SEO" desc="Server-rendered, OG meta, Google'da indekslanadi" />
      </div>
    </div>
  );
}

function Row({ label, value, editLink }: { label: string; value: string; editLink: string }) {
  return (
    <div className="flex justify-between items-center border-b py-2 last:border-0">
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-gray-500">{value}</div>
      </div>
      <a href={editLink} className="text-xs text-blue-500 hover:underline">
        Tahrirlash →
      </a>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="text-2xl">{icon}</div>
      <div className="font-semibold mt-2">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{desc}</div>
    </div>
  );
}
