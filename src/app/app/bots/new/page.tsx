"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";

type TemplateCard = {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  vertical: string | null;
  is_pack: boolean;
  brand_kit: {
    primary_color?: string;
    accent_color?: string;
    gradient?: string;
    emoji_set?: string[];
  } | Record<string, never>;
  default_welcome: string;
  services_count: number;
  faq_count: number;
  broadcasts_count: number;
};

export default function NewBotPage() {
  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        setLoading(false);
      });
  }, []);

  const packs = templates.filter((t) => t.is_pack);
  const horizontal = templates.filter((t) => !t.is_pack);

  return (
    <div>
      <Topbar title="Bot turini tanlang" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {loading ? (
          <div className="text-sm text-muted py-12 text-center">Yuklanmoqda…</div>
        ) : (
          <>
            <Section title="📦 Tayyor packlar" subtitle="Real narx, FAQ, ish vaqti — hammasi to‘ldirilgan">
              <div className="grid gap-3">
                {packs.map((p) => (
                  <PackCard key={p.id} pack={p} />
                ))}
              </div>
            </Section>

            {horizontal.length > 0 && (
              <Section
                title="📄 Universal template’lar"
                subtitle="Bo‘sh template — o‘zingiz to‘ldirasiz"
              >
                <div className="grid gap-2">
                  {horizontal.map((t) => (
                    <Link
                      key={t.id}
                      href={`/app/bots/new/wizard/${t.id}`}
                      className="panel p-4 flex gap-3 hover:border-accent transition"
                    >
                      <div className="text-2xl">{t.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted leading-snug mt-0.5">
                          {t.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-muted mb-3 mt-0.5">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function PackCard({ pack }: { pack: TemplateCard }) {
  const bk = pack.brand_kit as {
    primary_color?: string;
    accent_color?: string;
    gradient?: string;
    emoji_set?: string[];
  };
  const gradient =
    bk.gradient ?? `linear-gradient(135deg, ${bk.primary_color ?? "#7c5cff"} 0%, ${bk.accent_color ?? "#19c37d"} 100%)`;

  return (
    <div className="panel overflow-hidden border border-border">
      <div
        className="h-24 flex items-center px-5 relative"
        style={{ background: gradient }}
      >
        <div className="text-5xl drop-shadow-md">{pack.icon}</div>
        <div className="absolute right-4 top-3 flex gap-1">
          {(bk.emoji_set ?? []).slice(0, 3).map((e, i) => (
            <span key={i} className="text-lg opacity-70">
              {e}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="font-bold text-base">{pack.name}</div>
          <div className="text-xs text-muted leading-snug mt-0.5">
            {pack.description}
          </div>
        </div>
        <div className="text-xs text-muted italic px-3 py-2 bg-bg rounded-lg border border-border">
          “{pack.default_welcome}”
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Badge>✓ {pack.services_count} xizmat</Badge>
          <Badge>✓ {pack.faq_count} FAQ</Badge>
          <Badge>✓ {pack.broadcasts_count} broadcast</Badge>
          <Badge>✓ Brand kit</Badge>
        </div>
        <div className="flex gap-2 pt-1">
          <Link
            href={`/app/bots/new/demo/${pack.id}`}
            className="btn-ghost flex-1 !py-2 !text-xs"
          >
            👁️ Sinab ko‘rish
          </Link>
          <Link
            href={`/app/bots/new/wizard/${pack.id}`}
            className="btn-primary flex-1 !py-2 !text-xs"
          >
            🚀 Tanlash
          </Link>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-bg border border-border text-muted">
      {children}
    </span>
  );
}
