import { apiFetch } from './api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  hasPaid: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminProject {
  id: string
  name: string
  status: string
  templateKey: string | null
  updatedAt: string
  user: { id: string; email: string }
  config: { id: string } | null
  generatedVersion: { versionNumber: number } | null
  deployments: Array<{ status: string; errorMsg: string | null }>
}

export interface AdminPayment {
  id: string
  stripeSessionId: string
  stripePaymentIntentId: string | null
  amountCents: number
  currency: string
  status: string
  createdAt: string
  updatedAt: string
  user: { id: string; email: string }
}

export interface AdminDeployment {
  id: string
  status: string
  pm2Name: string | null
  errorMsg: string | null
  bullJobId: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
  project: {
    id: string
    name: string
    templateKey: string | null
    status: string
    user: { id: string; email: string }
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

export function getAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users')
}

export function getAdminProjects(): Promise<AdminProject[]> {
  return apiFetch<AdminProject[]>('/admin/projects')
}

export function getAdminPayments(): Promise<AdminPayment[]> {
  return apiFetch<AdminPayment[]>('/admin/payments')
}

export function getAdminDeployments(): Promise<AdminDeployment[]> {
  return apiFetch<AdminDeployment[]>('/admin/deployments')
}

export function adminRedeploy(projectId: string): Promise<{ ok: boolean; deploymentJobId: string }> {
  return apiFetch(`/admin/projects/${projectId}/redeploy`, { method: 'POST' })
}
