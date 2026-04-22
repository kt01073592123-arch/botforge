import type { TemplateDef, TemplateMetadata, ConfigField } from './types'
import { leadCaptureBotTemplate } from './lead-capture-bot'
import { orderBotTemplate } from './order-bot'
import { bookingBotTemplate } from './booking-bot'
import { supportBotTemplate } from './support-bot'

// ── Registry ──────────────────────────────────────────────────────────────────
// Add new templates here as they are built. Key must match template.metadata.key.

const REGISTRY: Record<string, TemplateDef> = {
  'lead-capture-bot': leadCaptureBotTemplate,
  'order-bot': orderBotTemplate,
  'booking-bot': bookingBotTemplate,
  'support-bot': supportBotTemplate,
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns all active templates' metadata (safe to send to the frontend). */
export function getActiveTemplates(): TemplateMetadata[] {
  return Object.values(REGISTRY)
    .filter((t) => t.metadata.isActive)
    .map((t) => t.metadata)
}

/** Returns a template's metadata + fields for the frontend config form. */
export function getTemplateDetail(
  key: string,
): { metadata: TemplateMetadata; fields: ConfigField[] } | null {
  const tpl = REGISTRY[key]
  if (!tpl || !tpl.metadata.isActive) return null
  return { metadata: tpl.metadata, fields: tpl.fields }
}

/** Returns the full TemplateDef including the Zod schema (backend use only). */
export function getTemplateDef(key: string): TemplateDef | null {
  return REGISTRY[key] ?? null
}

/** Returns true if the key exists in the registry and is active. */
export function isValidTemplateKey(key: string): boolean {
  return key in REGISTRY && REGISTRY[key].metadata.isActive
}
