import { apiFetch } from './api'

// ── Types ─────────────────────────────────────────────────────────────────────
// Mirror of packages/templates/src/types.ts — duplicated so the frontend
// doesn't import from the backend package (keeps the bundle clean).

export type ConfigFieldType = 'text' | 'textarea' | 'password' | 'boolean' | 'url' | 'number' | 'select'

export interface ConfigField {
  name: string
  type: ConfigFieldType
  label: string
  placeholder?: string
  description?: string
  required: boolean
  maxLength?: number
  defaultValue?: string | boolean | number
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
}

export interface TemplateMetadata {
  key: string
  name: string
  description: string
  category: string
  isActive: boolean
  isPaid: boolean
  priceUsd: number
}

export interface TemplateDetail {
  metadata: TemplateMetadata
  fields: ConfigField[]
}

// ── API helpers ───────────────────────────────────────────────────────────────

export function listTemplates(): Promise<TemplateMetadata[]> {
  return apiFetch<TemplateMetadata[]>('/templates')
}

export function getTemplateDetail(key: string): Promise<TemplateDetail> {
  return apiFetch<TemplateDetail>(`/templates/${key}`)
}
