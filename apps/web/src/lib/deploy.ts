import { apiFetch } from './api'
import { ApiError } from './api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeploymentSummary {
  id: string
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  pm2Name: string | null
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

export function triggerDeploy(projectId: string): Promise<DeploymentSummary> {
  return apiFetch<DeploymentSummary>(`/projects/${projectId}/deploy`, {
    method: 'POST',
  })
}

export async function getDeployStatus(projectId: string): Promise<DeploymentSummary | null> {
  try {
    return await apiFetch<DeploymentSummary>(`/projects/${projectId}/deploy`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function getDeployHistory(projectId: string): Promise<DeploymentSummary[]> {
  return apiFetch<DeploymentSummary[]>(`/projects/${projectId}/deploys`)
}

export function stopBot(projectId: string): Promise<{ stopped: boolean }> {
  return apiFetch<{ stopped: boolean }>(`/projects/${projectId}/stop`, {
    method: 'POST',
  })
}
