import { Worker } from 'bullmq'
import { redisConnection } from './redis/redis.client'
import { QUEUE_NAMES, JOB_NAMES } from './queues/queue.names'
import { handleGenerateProject } from './processors/generate-project.processor'
import { handleBuildProject } from './processors/build-project.processor'
import { handleDeployProject } from './processors/deploy-project.processor'
import type {
  GenerateProjectJobPayload,
  BuildProjectJobPayload,
  DeployProjectJobPayload,
} from '@botforge/shared'
import type { Job } from 'bullmq'

async function bootstrap() {
  console.log('[Worker] BotForge worker starting...')
  console.log(`[Worker] Queue: ${QUEUE_NAMES.BOT_PIPELINE}`)

  const worker = new Worker(
    QUEUE_NAMES.BOT_PIPELINE,
    async (job: Job) => {
      switch (job.name) {
        case JOB_NAMES.GENERATE_PROJECT:
          return handleGenerateProject(job as Job<GenerateProjectJobPayload>)

        case JOB_NAMES.BUILD_PROJECT:
          return handleBuildProject(job as Job<BuildProjectJobPayload>)

        case JOB_NAMES.DEPLOY_PROJECT:
          return handleDeployProject(job as Job<DeployProjectJobPayload>)

        default:
          console.warn(`[Worker] Unknown job type: "${job.name}" — skipping`)
      }
    },
    {
      connection: redisConnection,
      concurrency: 3, // max 3 pipeline jobs running simultaneously
    },
  )

  worker.on('active', (job) => {
    console.log(`[Worker] Started  → ${job.name} (${job.id})`)
  })

  worker.on('completed', (job) => {
    console.log(`[Worker] Completed → ${job.name} (${job.id})`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Failed   → ${job?.name} (${job?.id}): ${err.message}`)
  })

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Worker] Shutting down...')
    await worker.close()
    await redisConnection.quit()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  console.log('[Worker] Ready — waiting for jobs')
}

bootstrap().catch((err) => {
  console.error('[Worker] Fatal startup error:', err)
  process.exit(1)
})
