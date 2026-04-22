// Kept in sync with packages/shared/src/constants/index.ts
// Duplicated here to avoid workspace import issues during early bootstrap.

export const QUEUE_NAMES = {
  BOT_PIPELINE: 'bot-pipeline',
} as const

export const JOB_NAMES = {
  GENERATE_PROJECT: 'generate-project',
  BUILD_PROJECT: 'build-project',
  DEPLOY_PROJECT: 'deploy-project',
} as const
