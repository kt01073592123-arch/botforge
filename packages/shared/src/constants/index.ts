// ── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  BOT_PIPELINE: 'bot-pipeline',
} as const

// ── Job names (within the pipeline queue) ────────────────────────────────────

export const JOB_NAMES = {
  GENERATE_PROJECT: 'generate-project',
  BUILD_PROJECT: 'build-project',
  DEPLOY_PROJECT: 'deploy-project',
} as const

// ── API version ───────────────────────────────────────────────────────────────

export const API_VERSION = 'v1' as const

// ── Bot workspace base path (on VPS) ─────────────────────────────────────────

export const BOT_WORKSPACE_BASE = '/var/botforge/bots' as const
