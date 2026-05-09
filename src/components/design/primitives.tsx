// Design system primitives — har component brand kit'dan rang/font oladi.
// Hammasi server-rendered (SEO friendly), inline styles bilan.

import type { CSSProperties, ReactNode } from "react";

export type Kit = {
  primary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  text_muted_color: string;
  gradient_from: string;
  gradient_to: string;
  font_heading: string;
  font_body: string;
  emoji_set: string[];
  logo_emoji: string;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
};

export function FontLoader({ kit }: { kit: Kit }) {
  const heading = encodeURIComponent(kit.font_heading);
  const body = encodeURIComponent(kit.font_body);
  return (
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?family=${heading}:wght@400;600;700;800&family=${body}:wght@400;500;600&display=swap`}
    />
  );
}

// ════════════════════════════════════════════════════════════
// 1. HERO — 3 ta variant: image-bg, gradient, split
// ════════════════════════════════════════════════════════════
export function HeroImage({
  kit,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
  ctaPrimaryHref,
  ctaSecondaryHref,
}: {
  kit: Kit;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryHref?: string;
}) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: 520 }}>
      {kit.hero_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={kit.hero_image_url}
          alt={kit.hero_image_alt ?? ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(120deg, ${kit.gradient_from}cc 0%, ${kit.gradient_to}66 60%, transparent 100%)`,
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 text-white">
        <div className="text-5xl mb-4">{kit.logo_emoji}</div>
        <h1
          className="text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl"
          style={{ fontFamily: kit.font_heading }}
        >
          {headline}
        </h1>
        <p className="mt-5 max-w-2xl text-lg md:text-xl opacity-95">{subheadline}</p>
        <div className="mt-8 flex gap-3 flex-wrap">
          <a
            href={ctaPrimaryHref ?? "#"}
            className="px-8 py-4 rounded-xl font-semibold text-base shadow-lg hover:scale-105 transition"
            style={{ backgroundColor: kit.primary_color, color: "#fff" }}
          >
            {ctaPrimary}
          </a>
          {ctaSecondary && (
            <a
              href={ctaSecondaryHref ?? "#"}
              className="px-8 py-4 rounded-xl font-semibold text-base border-2 border-white/80 text-white hover:bg-white/10 transition"
            >
              {ctaSecondary}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function HeroSplit({
  kit,
  headline,
  subheadline,
  ctaPrimary,
}: {
  kit: Kit;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
}) {
  return (
    <section style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-4xl mb-4">{kit.logo_emoji}</div>
          <h1
            className="text-4xl md:text-5xl font-extrabold leading-tight"
            style={{ fontFamily: kit.font_heading, color: kit.text_color }}
          >
            {headline}
          </h1>
          <p
            className="mt-4 text-lg leading-relaxed"
            style={{ color: kit.text_muted_color }}
          >
            {subheadline}
          </p>
          <a
            href="#"
            className="inline-block mt-7 px-8 py-4 rounded-xl font-semibold text-base shadow-md hover:scale-105 transition"
            style={{ backgroundColor: kit.primary_color, color: "#fff" }}
          >
            {ctaPrimary}
          </a>
        </div>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
          {kit.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kit.hero_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${kit.gradient_from}, ${kit.gradient_to})`,
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 2. USP / Features grid (3 yoki 4 column)
// ════════════════════════════════════════════════════════════
export function FeatureGrid({
  kit,
  items,
  title,
}: {
  kit: Kit;
  items: Array<{ icon: string; title: string; description: string }>;
  title?: string;
}) {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-6xl mx-auto px-6">
        {title && (
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ fontFamily: kit.font_heading, color: kit.text_color }}
          >
            {title}
          </h2>
        )}
        <div className={`grid md:grid-cols-${Math.min(items.length, 4)} gap-6`}>
          {items.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl transition hover:scale-105"
              style={{ backgroundColor: kit.surface_color }}
            >
              <div className="text-4xl">{item.icon}</div>
              <h3
                className="mt-4 font-bold text-xl"
                style={{ fontFamily: kit.font_heading, color: kit.text_color }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: kit.text_muted_color }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 3. PRICING table (3 ta tier)
// ════════════════════════════════════════════════════════════
export function PricingTable({
  kit,
  tiers,
}: {
  kit: Kit;
  tiers: Array<{ name: string; price: string; description?: string; features: string[]; highlighted?: boolean; cta?: string }>;
}) {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: kit.surface_color }}>
      <div className="max-w-6xl mx-auto px-6">
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ fontFamily: kit.font_heading, color: kit.text_color }}
        >
          Tariflar
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl ${t.highlighted ? "shadow-2xl scale-105" : "border"}`}
              style={
                t.highlighted
                  ? { background: `linear-gradient(135deg, ${kit.gradient_from}, ${kit.gradient_to})`, color: "#fff" }
                  : { backgroundColor: kit.background_color, borderColor: kit.text_muted_color + "33" }
              }
            >
              <div className="text-sm opacity-70">{t.name}</div>
              <div className="text-4xl font-bold mt-2" style={{ fontFamily: kit.font_heading }}>
                {t.price}
              </div>
              {t.description && <div className="mt-2 text-sm opacity-80">{t.description}</div>}
              <ul className="mt-6 space-y-2">
                {t.features.map((f, j) => (
                  <li key={j} className="flex gap-2 text-sm">
                    <span>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {t.cta && (
                <a
                  href="#"
                  className="block text-center mt-7 py-3 rounded-lg font-semibold"
                  style={
                    t.highlighted
                      ? { backgroundColor: "#fff", color: kit.primary_color }
                      : { backgroundColor: kit.primary_color, color: "#fff" }
                  }
                >
                  {t.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 4. GALLERY — Photo grid
// ════════════════════════════════════════════════════════════
export function Gallery({ kit, items }: { kit: Kit; items: Array<{ url: string; alt?: string }> }) {
  if (items.length === 0) return null;
  return (
    <section className="py-16" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ fontFamily: kit.font_heading }}>
          Galereya
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.slice(0, 12).map((g, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt={g.alt ?? ""} className="w-full h-full object-cover hover:scale-110 transition" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 5. TESTIMONIALS slider (3 column grid mobile-friendly)
// ════════════════════════════════════════════════════════════
export function Testimonials({
  kit,
  items,
}: {
  kit: Kit;
  items: Array<{ name: string; text: string; rating: number; avatar?: string }>;
}) {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: kit.surface_color }}>
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ fontFamily: kit.font_heading }}>
          Mijozlar fikri
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.slice(0, 6).map((t, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl"
              style={{ backgroundColor: kit.background_color, color: kit.text_color }}
            >
              <div className="text-yellow-500 text-lg">{"★".repeat(t.rating)}</div>
              <p className="mt-4 leading-relaxed italic">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: kit.primary_color, color: "#fff" }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 6. FAQ accordion (collapse)
// ════════════════════════════════════════════════════════════
export function Faq({ kit, items }: { kit: Kit; items: Array<{ q: string; a: string }> }) {
  if (items.length === 0) return null;
  return (
    <section className="py-16" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ fontFamily: kit.font_heading }}>
          Tez-tez beriladigan savollar
        </h2>
        <div className="space-y-3">
          {items.map((f, i) => (
            <details
              key={i}
              className="rounded-xl p-5 cursor-pointer transition open:shadow-md"
              style={{ backgroundColor: kit.surface_color }}
            >
              <summary className="font-semibold list-none flex justify-between items-center">
                <span>{f.q}</span>
                <span className="text-xl" style={{ color: kit.primary_color }}>+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: kit.text_muted_color }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 7. CTA banner
// ════════════════════════════════════════════════════════════
export function CtaBanner({
  kit,
  title,
  description,
  cta,
  href,
}: {
  kit: Kit;
  title: string;
  description?: string;
  cta: string;
  href?: string;
}) {
  return (
    <section className="py-12">
      <div
        className="max-w-5xl mx-auto px-8 py-12 rounded-3xl text-center text-white"
        style={{ background: `linear-gradient(135deg, ${kit.gradient_from}, ${kit.gradient_to})` }}
      >
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: kit.font_heading }}>
          {title}
        </h2>
        {description && <p className="mt-4 max-w-2xl mx-auto opacity-95">{description}</p>}
        <a
          href={href ?? "#"}
          className="inline-block mt-7 px-8 py-4 bg-white rounded-xl font-bold hover:scale-105 transition"
          style={{ color: kit.primary_color }}
        >
          {cta}
        </a>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 8. STATS counters
// ════════════════════════════════════════════════════════════
export function Stats({ kit, items }: { kit: Kit; items: Array<{ value: string; label: string }> }) {
  return (
    <section className="py-12" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {items.map((s, i) => (
          <div key={i}>
            <div className="text-4xl font-bold" style={{ color: kit.primary_color, fontFamily: kit.font_heading }}>
              {s.value}
            </div>
            <div className="mt-2 text-sm" style={{ color: kit.text_muted_color }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 9. ABOUT block
// ════════════════════════════════════════════════════════════
export function About({ kit, text }: { kit: Kit; text: string }) {
  return (
    <section className="py-16 md:py-20" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2
          className="text-3xl md:text-4xl font-bold mb-6"
          style={{ fontFamily: kit.font_heading, color: kit.primary_color }}
        >
          Biz haqimizda
        </h2>
        <p className="text-base md:text-lg leading-relaxed" style={{ color: kit.text_color }}>
          {text}
        </p>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// 10. CONTACT bar
// ════════════════════════════════════════════════════════════
export function ContactBar({
  kit,
  contacts,
  deepLink,
}: {
  kit: Kit;
  contacts?: { phone?: string; address?: string; instagram?: string };
  deepLink?: string;
}) {
  return (
    <section
      className="py-10 px-6 text-white"
      style={{ background: `linear-gradient(135deg, ${kit.gradient_from}, ${kit.gradient_to})` }}
    >
      <div className="max-w-5xl mx-auto flex flex-wrap gap-6 justify-center text-sm md:text-base">
        {contacts?.phone && (
          <a href={`tel:${contacts.phone}`} className="flex items-center gap-2 hover:underline">
            <span>📞</span> {contacts.phone}
          </a>
        )}
        {contacts?.address && (
          <span className="flex items-center gap-2">
            <span>📍</span> {contacts.address}
          </span>
        )}
        {contacts?.instagram && (
          <a
            href={`https://instagram.com/${contacts.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:underline"
          >
            <span>📸</span> @{contacts.instagram.replace(/^@/, "")}
          </a>
        )}
        {deepLink && (
          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full font-semibold"
            style={{ color: kit.primary_color }}
          >
            <span>🤖</span> Telegram bot
          </a>
        )}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// SHARED Page wrapper — har bir template shu bilan o'raladi
// ════════════════════════════════════════════════════════════
export function PageShell({ kit, children }: { kit: Kit; children: ReactNode }) {
  const style: CSSProperties = {
    backgroundColor: kit.background_color,
    color: kit.text_color,
    fontFamily: kit.font_body,
  };
  return (
    <div style={style} className="min-h-screen">
      <FontLoader kit={kit} />
      {children}
    </div>
  );
}
