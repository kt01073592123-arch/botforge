import { apiFetch, ApiError } from './api'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

// Fetch the currently authenticated user from the API.
// Returns null if not authenticated (401) or on any error.
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>('/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    return null
  }
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' })
}
