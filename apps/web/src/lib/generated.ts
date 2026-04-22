import { apiFetch } from './api'
import { ApiError } from './api'

// ── Types ─────────────────────────────────────────────────────────────────────
// Mirrors GenerationSummary from the API — no file contents, no secrets.

export interface GenerationSummary {
  id: string
  versionNumber: number
  templateKey: string
  fileCount: number
  filePaths: string[]
  envVars: string[]
  generatedAt: string   // ISO timestamp
  createdAt: string
  updatedAt: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** Triggers source generation for a project. Returns the generation summary. */
export function generateProject(projectId: string): Promise<GenerationSummary> {
  return apiFetch<GenerationSummary>(`/projects/${projectId}/generate`, {
    method: 'POST',
  })
}

/**
 * Fetches an existing generation summary.
 * Returns null if the project has not been generated yet.
 */
export async function getGenerationSummary(
  projectId: string,
): Promise<GenerationSummary | null> {
  try {
    return await apiFetch<GenerationSummary>(`/projects/${projectId}/generated`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// ── Preview ──────────────────────────────────────────────────────────────────

export interface FilePreview {
  path: string
  size: number
  preview: string
}

export interface GenerationPreview {
  templateKey: string
  fileCount: number
  files: FilePreview[]
  envVars: string[]
}

export function getGenerationPreview(projectId: string): Promise<GenerationPreview> {
  return apiFetch<GenerationPreview>(`/projects/${projectId}/preview`)
}
