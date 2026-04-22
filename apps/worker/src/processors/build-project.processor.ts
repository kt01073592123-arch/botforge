import { Job } from 'bullmq'
import { BuildProjectJobPayload } from '@botforge/shared'

/**
 * BuildProject processor
 *
 * Installs dependencies and compiles the generated bot source code.
 *
 * TODO (Step 11 — Build Pipeline):
 *  1. Resolve workspace path: /var/botforge/bots/{projectId}
 *  2. Run: npm install  (in workspace)
 *  3. Run: npm run build  (tsc → dist/)
 *  4. Update BotProject.status → BUILDING → (success) leaves at GENERATED
 *  5. Dispatch deploy-project job
 *  6. On error: set BotProject.status → FAILED, write errorMsg
 */
export async function handleBuildProject(
  job: Job<BuildProjectJobPayload>,
): Promise<void> {
  const { projectId, userId } = job.data

  console.log(`[BuildProject] job=${job.id} project=${projectId} user=${userId}`)

  // Placeholder — real logic added in Step 11
  await job.updateProgress(100)

  console.log(`[BuildProject] Done (placeholder) project=${projectId}`)
}
