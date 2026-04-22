import { Job } from 'bullmq'
import { GenerateProjectJobPayload } from '@botforge/shared'

/**
 * GenerateProject processor
 *
 * Reads user config from DB, applies it to the bot template,
 * and writes the generated source files to the workspace directory.
 *
 * TODO (Step 10 — Template Engine):
 *  1. Load BotConfig from DB by projectId
 *  2. Resolve template slug from BotProject.templateId
 *  3. Load template files from packages/templates
 *  4. Replace {{PLACEHOLDER}} tokens with config values
 *  5. Write output to /var/botforge/bots/{projectId}/src/
 *  6. Write package.json to workspace root
 *  7. Update BotProject.status → GENERATED
 *  8. Update DeploymentJob.status → RUNNING
 *  9. Dispatch build-project job
 */
export async function handleGenerateProject(
  job: Job<GenerateProjectJobPayload>,
): Promise<void> {
  const { projectId, userId } = job.data

  console.log(`[GenerateProject] job=${job.id} project=${projectId} user=${userId}`)

  // Placeholder — real logic added in Step 10
  await job.updateProgress(100)

  console.log(`[GenerateProject] Done (placeholder) project=${projectId}`)
}
