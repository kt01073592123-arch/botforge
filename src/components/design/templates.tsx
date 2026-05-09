// 5 ta to'liq template — har biri vertikalga maxsus tartibda primitive'larni jamlaydi.
//
// Service (default)   — Hero + USP + About + Testimonial + CTA
// Salon               — Hero + Services + Master/Booking + Gallery + Testimonial
// Restaurant          — Hero + Menu + Gallery + Hours + Reservation
// Shop                — Hero + Categories + Featured products + Reviews
// Course              — Hero + Modules + Instructor + Pricing + FAQ

import {
  PageShell,
  HeroImage,
  HeroSplit,
  FeatureGrid,
  PricingTable,
  Gallery,
  Testimonials,
  Faq,
  CtaBanner,
  Stats,
  About,
  ContactBar,
  type Kit,
} from "./primitives";

export type TemplateContext = {
  kit: Kit;
  businessName: string;
  description?: string | null;
  // bot_data
  services: Array<{
    name: string;
    price: string;
    duration?: string;
    description?: string;
    photo_url?: string;
    category_id?: string;
    in_stock?: boolean;
  }>;
  categories?: Array<{ id: string; name: string }>;
  faq: Array<{ q: string; a: string }>;
  contacts?: { phone?: string; address?: string; instagram?: string };
  deepLink?: string;
  workingHours?: Record<string, [number, number] | null>;
};

// ════════════════════════════════════════════════════════════
// 1. SERVICE — universal
// ════════════════════════════════════════════════════════════
export function ServiceTemplate({ kit, ctx }: { kit: Kit; ctx: TemplateContext }) {
  return (
    <PageShell kit={kit}>
      <HeroImage
        kit={kit}
        headline={(kit as any).hero_headline ?? ctx.businessName}
        subheadline={(kit as any).hero_subheadline ?? ctx.description ?? ""}
        ctaPrimary={(kit as any).hero_cta_primary ?? "Boshlash"}
        ctaSecondary={(kit as any).hero_cta_secondary ?? "Batafsil"}
        ctaPrimaryHref={ctx.deepLink}
      />
      {(kit as any).usp_items?.length > 0 && (
        <FeatureGrid kit={kit} items={(kit as any).usp_items} title="Nima uchun bizni tanlashadi" />
      )}
      <Stats
        kit={kit}
        items={[
          { value: "5+", label: "yillik tajriba" },
          { value: "1000+", label: "mamnun mijoz" },
          { value: "24/7", label: "qo'llab-quvvatlash" },
          { value: "100%", label: "natija kafolati" },
        ]}
      />
      {(kit as any).about_text && <About kit={kit} text={(kit as any).about_text} />}
      {(kit as any).testimonial_seeds?.length > 0 && (
        <Testimonials kit={kit} items={(kit as any).testimonial_seeds} />
      )}
      <Faq kit={kit} items={ctx.faq} />
      <CtaBanner
        kit={kit}
        title="Hozirroq boshlamaymizmi?"
        description="Ariza qoldiring, biz bilan aloqaga chiqamiz."
        cta={(kit as any).hero_cta_primary ?? "Aloqa"}
        href={ctx.deepLink}
      />
      <ContactBar kit={kit} contacts={ctx.contacts} deepLink={ctx.deepLink} />
    </PageShell>
  );
}

// ════════════════════════════════════════════════════════════
// 2. SALON — beauty/hair/spa
// ════════════════════════════════════════════════════════════
export function SalonTemplate({ kit, ctx }: { kit: Kit; ctx: TemplateContext }) {
  const photos = ctx.services.filter((s) => s.photo_url).map((s) => ({ url: s.photo_url!, alt: s.name }));

  return (
    <PageShell kit={kit}>
      <HeroImage
        kit={kit}
        headline={(kit as any).hero_headline ?? ctx.businessName}
        subheadline={(kit as any).hero_subheadline ?? ""}
        ctaPrimary={(kit as any).hero_cta_primary ?? "Bron qilish"}
        ctaSecondary={(kit as any).hero_cta_secondary ?? "Xizmatlar"}
        ctaPrimaryHref={ctx.deepLink}
      />
      <ServicesGrid kit={kit} services={ctx.services} categories={ctx.categories} />
      {(kit as any).usp_items?.length > 0 && (
        <FeatureGrid kit={kit} items={(kit as any).usp_items} title="Nega bizga keladilar" />
      )}
      {photos.length > 0 && <Gallery kit={kit} items={photos} />}
      {(kit as any).testimonial_seeds?.length > 0 && (
        <Testimonials kit={kit} items={(kit as any).testimonial_seeds} />
      )}
      <Faq kit={kit} items={ctx.faq} />
      <CtaBanner
        kit={kit}
        title="Bron qilishga tayyormisiz?"
        description="Botda bir necha bosqichda yozilasiz."
        cta="🤖 Bot orqali bron"
        href={ctx.deepLink}
      />
      <ContactBar kit={kit} contacts={ctx.contacts} deepLink={ctx.deepLink} />
    </PageShell>
  );
}

// ════════════════════════════════════════════════════════════
// 3. RESTAURANT — menu, hours, reservation
// ════════════════════════════════════════════════════════════
export function RestaurantTemplate({ kit, ctx }: { kit: Kit; ctx: TemplateContext }) {
  const photos = ctx.services.filter((s) => s.photo_url).map((s) => ({ url: s.photo_url!, alt: s.name }));
  return (
    <PageShell kit={kit}>
      <HeroSplit
        kit={kit}
        headline={(kit as any).hero_headline ?? ctx.businessName}
        subheadline={(kit as any).hero_subheadline ?? ""}
        ctaPrimary={(kit as any).hero_cta_primary ?? "Stol band qilish"}
      />
      <MenuGrid kit={kit} services={ctx.services} categories={ctx.categories} />
      {photos.length > 0 && <Gallery kit={kit} items={photos} />}
      <WorkingHours kit={kit} hours={ctx.workingHours} />
      {(kit as any).testimonial_seeds?.length > 0 && (
        <Testimonials kit={kit} items={(kit as any).testimonial_seeds} />
      )}
      <CtaBanner
        kit={kit}
        title="Bizga tashrif buyuring"
        cta="📍 Manzil + bron"
        href={ctx.deepLink}
      />
      <ContactBar kit={kit} contacts={ctx.contacts} deepLink={ctx.deepLink} />
    </PageShell>
  );
}

// ════════════════════════════════════════════════════════════
// 4. SHOP — products + reviews
// ════════════════════════════════════════════════════════════
export function ShopTemplate({ kit, ctx }: { kit: Kit; ctx: TemplateContext }) {
  return (
    <PageShell kit={kit}>
      <HeroImage
        kit={kit}
        headline={(kit as any).hero_headline ?? ctx.businessName}
        subheadline={(kit as any).hero_subheadline ?? ""}
        ctaPrimary={(kit as any).hero_cta_primary ?? "Sotib olish"}
        ctaSecondary={(kit as any).hero_cta_secondary ?? "Katalog"}
        ctaPrimaryHref={ctx.deepLink}
      />
      <ProductsGrid kit={kit} services={ctx.services} categories={ctx.categories} />
      {(kit as any).usp_items?.length > 0 && (
        <FeatureGrid kit={kit} items={(kit as any).usp_items} title="Bizning afzalliklarimiz" />
      )}
      {(kit as any).testimonial_seeds?.length > 0 && (
        <Testimonials kit={kit} items={(kit as any).testimonial_seeds} />
      )}
      <Faq kit={kit} items={ctx.faq} />
      <ContactBar kit={kit} contacts={ctx.contacts} deepLink={ctx.deepLink} />
    </PageShell>
  );
}

// ════════════════════════════════════════════════════════════
// 5. COURSE — modules + instructor + pricing
// ════════════════════════════════════════════════════════════
export function CourseTemplate({ kit, ctx }: { kit: Kit; ctx: TemplateContext }) {
  // Service'larni "module" sifatida ko'rsatamiz
  return (
    <PageShell kit={kit}>
      <HeroSplit
        kit={kit}
        headline={(kit as any).hero_headline ?? ctx.businessName}
        subheadline={(kit as any).hero_subheadline ?? ""}
        ctaPrimary={(kit as any).hero_cta_primary ?? "Yozilish"}
      />
      {(kit as any).usp_items?.length > 0 && (
        <FeatureGrid kit={kit} items={(kit as any).usp_items} title="Nimaga o'rganasiz" />
      )}
      <ModulesList kit={kit} services={ctx.services} />
      {(kit as any).about_text && <About kit={kit} text={(kit as any).about_text} />}
      <PricingTable
        kit={kit}
        tiers={[
          {
            name: "Basic",
            price: "990 000 so'm",
            description: "Asosiy darslar",
            features: ["10 dars", "Sertifikat", "Chat support"],
            cta: "Boshlash",
          },
          {
            name: "Pro",
            price: "1 990 000 so'm",
            description: "Mentor bilan",
            features: ["20 dars", "Sertifikat", "1-1 mentor", "Loyiha sharhi"],
            highlighted: true,
            cta: "Tanlash",
          },
          {
            name: "VIP",
            price: "3 990 000 so'm",
            description: "Maksimal yondashuv",
            features: ["Hammasi", "Bog'lash kafolati", "Career coach", "Network"],
            cta: "Bog'lanish",
          },
        ]}
      />
      <Faq kit={kit} items={ctx.faq} />
      <CtaBanner kit={kit} title="Hoziroq boshlang!" cta="🤖 Yozilish" href={ctx.deepLink} />
      <ContactBar kit={kit} contacts={ctx.contacts} deepLink={ctx.deepLink} />
    </PageShell>
  );
}

// ════════════════════════════════════════════════════════════
// HELPER blocks
// ════════════════════════════════════════════════════════════
function ServicesGrid({
  kit,
  services,
  categories,
}: {
  kit: Kit;
  services: TemplateContext["services"];
  categories?: TemplateContext["categories"];
}) {
  if (services.length === 0) return null;
  return (
    <section className="py-16" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ fontFamily: kit.font_heading }}>
          Bizning xizmatlar
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden shadow hover:shadow-xl transition"
              style={{ backgroundColor: kit.surface_color }}
            >
              {s.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo_url} alt={s.name} className="w-full aspect-[4/3] object-cover" />
              )}
              <div className="p-5">
                <h3 className="font-bold text-lg" style={{ fontFamily: kit.font_heading }}>
                  {s.name}
                </h3>
                {s.description && (
                  <p className="mt-2 text-sm" style={{ color: kit.text_muted_color }}>
                    {s.description}
                  </p>
                )}
                <div className="mt-3 flex justify-between items-center">
                  <div className="font-bold" style={{ color: kit.primary_color }}>
                    {s.price}
                  </div>
                  {s.duration && <div className="text-xs opacity-60">{s.duration}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MenuGrid({
  kit,
  services,
  categories,
}: {
  kit: Kit;
  services: TemplateContext["services"];
  categories?: TemplateContext["categories"];
}) {
  if (services.length === 0) return null;
  const cats = categories?.length ? categories : [{ id: "all", name: "Menyu" }];

  return (
    <section className="py-16" style={{ backgroundColor: kit.surface_color }}>
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ fontFamily: kit.font_heading }}>
          Menyu
        </h2>
        <div className="space-y-10">
          {cats.map((c) => {
            const items = c.id === "all" ? services : services.filter((s) => s.category_id === c.id);
            if (items.length === 0) return null;
            return (
              <div key={c.id}>
                <h3
                  className="text-xl font-bold mb-4"
                  style={{ color: kit.primary_color, fontFamily: kit.font_heading }}
                >
                  {c.name}
                </h3>
                <div className="space-y-3">
                  {items.map((s, i) => (
                    <div key={i} className="flex justify-between items-baseline gap-3 border-b border-dashed pb-2" style={{ borderColor: kit.text_muted_color + "40" }}>
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        {s.description && (
                          <div className="text-xs" style={{ color: kit.text_muted_color }}>
                            {s.description}
                          </div>
                        )}
                      </div>
                      <div className="font-bold whitespace-nowrap" style={{ color: kit.primary_color }}>
                        {s.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductsGrid({
  kit,
  services,
  categories,
}: {
  kit: Kit;
  services: TemplateContext["services"];
  categories?: TemplateContext["categories"];
}) {
  if (services.length === 0) return null;
  return (
    <section className="py-16" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ fontFamily: kit.font_heading }}>
          Mahsulotlar
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {services.map((s, i) => (
            <div key={i} className="rounded-xl overflow-hidden hover:shadow-xl transition" style={{ backgroundColor: kit.surface_color }}>
              <div className="aspect-square bg-gray-100">
                {s.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="mt-1 font-bold text-base" style={{ color: kit.primary_color }}>
                  {s.price}
                </div>
                {s.in_stock === false && <div className="mt-1 text-xs text-red-500">Yo'q</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesList({ kit, services }: { kit: Kit; services: TemplateContext["services"] }) {
  if (services.length === 0) return null;
  return (
    <section className="py-16" style={{ backgroundColor: kit.surface_color }}>
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ fontFamily: kit.font_heading }}>
          Dastur
        </h2>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="p-5 rounded-xl flex gap-4 items-start" style={{ backgroundColor: kit.background_color }}>
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold"
                style={{ backgroundColor: kit.primary_color, color: "#fff" }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-bold">{s.name}</div>
                {s.description && (
                  <div className="text-sm mt-1" style={{ color: kit.text_muted_color }}>
                    {s.description}
                  </div>
                )}
                {s.duration && <div className="text-xs mt-1 opacity-60">{s.duration}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkingHours({ kit, hours }: { kit: Kit; hours?: Record<string, [number, number] | null> }) {
  if (!hours || Object.keys(hours).length === 0) return null;
  const days: Record<string, string> = {
    mon: "Dushanba", tue: "Seshanba", wed: "Chorshanba", thu: "Payshanba",
    fri: "Juma", sat: "Shanba", sun: "Yakshanba",
  };
  return (
    <section className="py-12" style={{ backgroundColor: kit.background_color }}>
      <div className="max-w-md mx-auto px-6">
        <h2 className="text-2xl font-bold text-center mb-6" style={{ fontFamily: kit.font_heading }}>
          Ish vaqti
        </h2>
        <div className="space-y-2">
          {Object.entries(hours).map(([d, h]) => (
            <div key={d} className="flex justify-between text-sm border-b pb-2" style={{ borderColor: kit.text_muted_color + "20" }}>
              <span className="font-semibold">{days[d] ?? d}</span>
              <span style={{ color: kit.text_muted_color }}>
                {h ? `${h[0]}:00 – ${h[1]}:00` : "Dam"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// ROUTER — template_id ga qarab to'g'ri template render qiladi
// ════════════════════════════════════════════════════════════
export function renderTemplate(templateId: string, kit: Kit, ctx: TemplateContext) {
  switch (templateId) {
    case "salon":
      return <SalonTemplate kit={kit} ctx={ctx} />;
    case "restaurant":
      return <RestaurantTemplate kit={kit} ctx={ctx} />;
    case "shop":
      return <ShopTemplate kit={kit} ctx={ctx} />;
    case "course":
      return <CourseTemplate kit={kit} ctx={ctx} />;
    case "service":
    default:
      return <ServiceTemplate kit={kit} ctx={ctx} />;
  }
}
