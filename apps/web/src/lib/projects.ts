import { apiFetch } from './api'

// ── Types ─────────────────────────────────────────────────────────────────────

// Returned by GET /projects — enriched with summary data for list cards.
// Optional fields are undefined on older responses (forward-compat).
export interface Project {
  id: string
  userId: string
  templateKey: string | null
  name: string
  status: string
  createdAt: string
  updatedAt: string
  // Enriched summary (present on list endpoint)
  config?: { id: string; validatedAt: string | null } | null
  generatedVersion?: { versionNumber: number; updatedAt: string } | null
  deployments?: Array<{ status: string; pm2Name: string | null; finishedAt: string | null }>
}

// Returned by GET /projects/:id/overview — full aggregated dashboard state.
// Single round-trip: no waterfalls, no frontend guesswork.
export interface ProjectOverview {
  id: string
  name: string
  status: string
  templateKey: string | null
  createdAt: string
  updatedAt: string
  config: {
    exists: boolean
    validatedAt: string | null
    updatedAt: string | null
  }
  generation: {
    versionNumber: number
    fileCount: number
    filePaths: string[]
    envVars: string[]
    generatedAt: string
    updatedAt: string
  } | null
  latestDeployment: {
    id: string
    status: string
    pm2Name: string | null
    errorMessage: string | null
    startedAt: string | null
    finishedAt: string | null
    createdAt: string
  } | null
  payment: {
    hasPaid: boolean
  }
}

export interface BotConfig {
  id: string
  projectId: string
  configData: Record<string, unknown>
  validatedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

export function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects')
}

export function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`)
}

/** Full dashboard state for a single project — use this on the detail page. */
export function getProjectOverview(id: string): Promise<ProjectOverview> {
  return apiFetch<ProjectOverview>(`/projects/${id}/overview`)
}

export function createProject(data: { name: string }): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function assignTemplate(
  projectId: string,
  templateKey: string,
): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}/template`, {
    method: 'PATCH',
    body: JSON.stringify({ templateKey }),
  })
}

export function getProjectConfig(projectId: string): Promise<BotConfig | null> {
  return apiFetch<BotConfig | null>(`/projects/${projectId}/config`)
}

export function saveProjectConfig(
  projectId: string,
  config: Record<string, unknown>,
): Promise<BotConfig> {
  return apiFetch<BotConfig>(`/projects/${projectId}/config`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}

export function renameProject(projectId: string, name: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function deleteProject(projectId: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}
