// Public landing page — mijozlar shu yerni ko‘radi va Telegram’da botni ochadi.
// Server component (SEO + tezroq).

import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Service = { name: string; price: string; duration?: string };
type Faq = { q: string; a: string };
type WorkingHours = Record<string, [number, number] | null>;
type BrandKit = {
  primary_color?: string;
  accent_color?: string;
  background_tint?: string;
  text_on_primary?: string;
  emoji_set?: string[];
  gradient?: string;
};

type PublicBotData = {
  business_name: string;
  description: string | null;
  icon: string;
  bot_username: string;
  deep_link: string;
  brand_kit: BrandKit | null;
  services: Service[];
  faq: Faq[];
  working_hours: WorkingHours;
  contacts: { phone?: string; address?: string; instagram?: string };
};

async function fetchData(username: string): Promise<PublicBotData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/public/${username}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBotData;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await props.params;
  const data = await fetchData(username);
  if (!data) return { title: "Topilmadi" };
  return {
    title: `${data.business_name} — Telegram bot`,
    description:
      data.description ?? `${data.business_name} — AI administrator. Bron, narxlar va savollar uchun.`,
    openGraph: {
      title: data.business_name,
      description:
        data.description ?? `${data.business_name} — AI administrator`,
      type: "website",
    },
  };
}

const DAY_NAMES: Record<string, string> = {
  mon: "Du", tue: "Se", wed: "Ch", thu: "Pa", fri: "Ju", sat: "Sh", sun: "Ya",
};

export default async function PublicBotPage(props: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await props.params;
  const data = await fetchData(username);
  if (!data) notFound();

  const bk = data.brand_kit ?? {};
  const gradient =
    bk.gradient ??
    `linear-gradient(135deg, ${bk.primary_color ?? "#7c5cff"} 0%, ${bk.accent_color ?? "#19c37d"} 100%)`;
  const accent = bk.accent_color ?? "#7c5cff";

  return (
    <div className="min-h-screen" style={{ background: bk.background_tint ?? "#0a0c10" }}>
      {/* Hero */}
      <header className="px-4 pt-12 pb-8 text-center" style={{ background: gradient, color: bk.text_on_primary ?? "#fff" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-7xl mb-4 drop-shadow-md">{data.icon}</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {data.business_name}
          </h1>
          {data.description && (
            <p className="text-base opacity-90 max-w-md mx-auto">
              {data.description}
            </p>
          )}
          <a
            href={data.deep_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 px-8 py-3.5 rounded-full bg-white text-base font-bold shadow-xl hover:scale-105 transition"
            style={{ color: accent }}
          >
            💬 Telegram’da ochish
          </a>
          <div className="text-xs opacity-75 mt-2">@{data.bot_username}</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8" style={{ color: "#1a1a1a" }}>
        {/* Services */}
        {data.services.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Xizmatlar va narxlar</h2>
            <div className="space-y-2">
              {data.services.map((s, i) => (
                <div
                  key={i}
                  className="flex justify-between items-baseline py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    {s.duration && (
                      <div className="text-xs text-gray-500">{s.duration}</div>
                    )}
                  </div>
                  <div className="font-bold whitespace-nowrap" style={{ color: accent }}>
                    {s.price}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Working hours + contacts */}
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.keys(data.working_hours).length > 0 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-bold mb-3">🕐 Ish vaqti</h2>
              <div className="space-y-1 text-sm">
                {Object.entries(data.working_hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="text-gray-600">{DAY_NAMES[day] ?? day}</span>
                    <span className="font-medium">
                      {hours === null
                        ? "Dam"
                        : `${hours[0]}:00 – ${hours[1]}:00`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(data.contacts.phone || data.contacts.address || data.contacts.instagram) && (
            <section className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-bold mb-3">📞 Aloqa</h2>
              <div className="space-y-2 text-sm">
                {data.contacts.phone && (
                  <a
                    href={`tel:${data.contacts.phone}`}
                    className="block hover:underline"
                  >
                    📞 {data.contacts.phone}
                  </a>
                )}
                {data.contacts.address && (
                  <div>📍 {data.contacts.address}</div>
                )}
                {data.contacts.instagram && (
                  <a
                    href={`https://instagram.com/${data.contacts.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:underline"
                  >
                    📱 @{data.contacts.instagram}
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* FAQ */}
        {data.faq.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Tez-tez beriladigan savollar</h2>
            <div className="space-y-4">
              {data.faq.map((f, i) => (
                <div key={i}>
                  <div className="font-semibold text-sm">{f.q}</div>
                  <div className="text-sm text-gray-600 mt-1">{f.a}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA bottom */}
        <div className="text-center pt-4">
          <a
            href={data.deep_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3.5 rounded-full text-base font-bold shadow-xl hover:scale-105 transition"
            style={{ background: gradient, color: bk.text_on_primary ?? "#fff" }}
          >
            💬 Bron qilish — Telegram’da
          </a>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-500">
        Built with{" "}
        <a href="/" className="font-medium hover:underline" style={{ color: accent }}>
          BotForge
        </a>
      </footer>
    </div>
  );
}
