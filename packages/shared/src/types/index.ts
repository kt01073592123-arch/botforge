// ── Job payload types (shared between API dispatcher and Worker processors) ──

export interface JobPayload {
  projectId: string
  userId: string
}

// Each job type extends the base payload.
// workspacePath is always derived from projectId: /var/botforge/bots/{projectId}
// so we don't need to pass it explicitly.

export interface GenerateProjectJobPayload extends JobPayload {}

export interface BuildProjectJobPayload extends JobPayload {}

export interface DeployProjectJobPayload extends JobPayload {
  deploymentJobId: string
}
