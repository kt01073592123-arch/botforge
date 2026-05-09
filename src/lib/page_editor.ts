// Page editor backend — bot_pages bilan ishlash. Block list, reorder, save.

import { db } from "./supabase/server";

export type Block =
  | { type: "hero"; order: number; props?: Record<string, unknown> }
  | { type: "features"; order: number; props?: { title?: string } }
  | { type: "services"; order: number; props?: Record<string, unknown> }
  | { type: "menu"; order: number; props?: Record<string, unknown> }
  | { type: "products"; order: number; props?: Record<string, unknown> }
  | { type: "modules"; order: number; props?: Record<string, unknown> }
  | { type: "gallery"; order: number; props?: Record<string, unknown> }
  | { type: "testimonials"; order: number; props?: Record<string, unknown> }
  | { type: "stats"; order: number; props?: Record<string, unknown> }
  | { type: "about"; order: number; props?: Record<string, unknown> }
  | { type: "pricing"; order: number; props?: { tiers?: unknown[] } }
  | { type: "faq"; order: number; props?: Record<string, unknown> }
  | { type: "cta_banner"; order: number; props?: { title?: string; cta?: string } }
  | { type: "working_hours"; order: number; props?: Record<string, unknown> }
  | { type: "contact"; order: number; props?: Record<string, unknown> };

export type PageRow = {
  id: string;
  bot_id: string;
  slug: string;
  title: string | null;
  meta_description: string | null;
  blocks: Block[];
  custom_css: string | null;
  custom_head: string | null;
  is_published: boolean;
};

const ALLOWED_BLOCK_TYPES = [
  "hero", "features", "services", "menu", "products", "modules", "gallery",
  "testimonials", "stats", "about", "pricing", "faq", "cta_banner",
  "working_hours", "contact",
];

// Default block layout — har biznes turi uchun
export function defaultLayout(vertical: string): Block[] {
  const baseFields: Block[] = [
    { type: "hero", order: 0 },
    { type: "features", order: 1 },
  ];
  switch (vertical) {
    case "salon":
      return [
        { type: "hero", order: 0 },
        { type: "services", order: 1 },
        { type: "features", order: 2 },
        { type: "gallery", order: 3 },
        { type: "testimonials", order: 4 },
        { type: "faq", order: 5 },
        { type: "cta_banner", order: 6 },
        { type: "contact", order: 7 },
      ];
    case "restaurant":
      return [
        { type: "hero", order: 0 },
        { type: "menu", order: 1 },
        { type: "gallery", order: 2 },
        { type: "working_hours", order: 3 },
        { type: "testimonials", order: 4 },
        { type: "cta_banner", order: 5 },
        { type: "contact", order: 6 },
      ];
    case "shop":
      return [
        { type: "hero", order: 0 },
        { type: "products", order: 1 },
        { type: "features", order: 2 },
        { type: "testimonials", order: 3 },
        { type: "faq", order: 4 },
        { type: "contact", order: 5 },
      ];
    case "course":
      return [
        { type: "hero", order: 0 },
        { type: "features", order: 1 },
        { type: "modules", order: 2 },
        { type: "about", order: 3 },
        { type: "pricing", order: 4 },
        { type: "faq", order: 5 },
        { type: "cta_banner", order: 6 },
        { type: "contact", order: 7 },
      ];
    case "service":
    default:
      return [
        { type: "hero", order: 0 },
        { type: "features", order: 1 },
        { type: "stats", order: 2 },
        { type: "about", order: 3 },
        { type: "testimonials", order: 4 },
        { type: "faq", order: 5 },
        { type: "cta_banner", order: 6 },
        { type: "contact", order: 7 },
      ];
  }
}

export async function getPage(botId: string, slug = "home"): Promise<PageRow | null> {
  const { data } = await db()
    .from("bot_pages")
    .select("*")
    .eq("bot_id", botId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as PageRow) ?? null;
}

export async function ensureDefaultPage(botId: string, vertical: string): Promise<PageRow> {
  const existing = await getPage(botId, "home");
  if (existing) return existing;
  const blocks = defaultLayout(vertical);
  const { data, error } = await db()
    .from("bot_pages")
    .insert({
      bot_id: botId,
      slug: "home",
      blocks,
      is_published: true,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "page insert failed");
  return data as PageRow;
}

export function validateBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  const out: Block[] = [];
  for (const [i, b] of blocks.entries()) {
    if (!b || typeof b !== "object") continue;
    const block = b as Record<string, unknown>;
    if (typeof block.type !== "string" || !ALLOWED_BLOCK_TYPES.includes(block.type)) continue;
    out.push({
      type: block.type as Block["type"],
      order: typeof block.order === "number" ? block.order : i,
      props: typeof block.props === "object" && block.props !== null ? (block.props as Record<string, unknown>) : undefined,
    } as Block);
  }
  return out.sort((a, b) => a.order - b.order);
}

export async function savePage(opts: {
  botId: string;
  slug?: string;
  blocks?: unknown;
  customCss?: string;
  customHead?: string;
  title?: string;
  metaDescription?: string;
}): Promise<PageRow> {
  const sb = db();
  const slug = opts.slug ?? "home";
  const blocks = opts.blocks !== undefined ? validateBlocks(opts.blocks) : undefined;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (blocks !== undefined) patch.blocks = blocks;
  if (opts.customCss !== undefined) patch.custom_css = sanitizeCss(opts.customCss);
  if (opts.customHead !== undefined) patch.custom_head = sanitizeHead(opts.customHead);
  if (opts.title !== undefined) patch.title = opts.title.slice(0, 200);
  if (opts.metaDescription !== undefined) patch.meta_description = opts.metaDescription.slice(0, 400);

  await sb.from("bot_pages").update(patch).eq("bot_id", opts.botId).eq("slug", slug);
  const updated = await getPage(opts.botId, slug);
  if (!updated) throw new Error("page not found after save");
  return updated;
}

// Custom CSS — script va @import'larni rad qilamiz, faqat CSS qoidalari
function sanitizeCss(css: string): string {
  return css
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/@import[^;]*;/gi, "")
    .slice(0, 50_000);
}

function sanitizeHead(head: string): string {
  return head
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .slice(0, 5_000);
}
