import { apiFetch } from './api'

export interface AIConfigResult {
  templateKey: string
  templateName: string
  config: Record<string, unknown>
  explanation: string
}

export function generateConfigFromPrompt(
  prompt: string,
  aiProvider: 'openai' | 'gemini',
  aiApiKey: string,
): Promise<AIConfigResult> {
  return apiFetch<AIConfigResult>('/ai/generate-config', {
    method: 'POST',
    body: JSON.stringify({ prompt, aiProvider, aiApiKey }),
  })
}

export function applyAIConfig(
  projectId: string,
  templateKey: string,
  config: Record<string, unknown>,
): Promise<{ applied: boolean }> {
  return apiFetch<{ applied: boolean }>(`/ai/apply/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ templateKey, config }),
  })
}
