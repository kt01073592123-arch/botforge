import { Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import type { DeployProjectJobPayload } from '@botforge/shared'
import {
  getWorkspacePath,
  cleanWorkspace,
  createWorkspace,
  writeGeneratedFiles,
  writeEnvFile,
  buildEnvFileContent,
} from '../lib/workspace'
import { runCommand } from '../lib/run-command'
import { startBotProcess, stopBotProcess } from '../lib/pm2-manager'
import { decryptSecretData } from '../lib/crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourceSnapshot {
  files: Array<{ path: string; content: string }>
  envVars: string[]
  envMapping: Record<string, string>
  templateKey: string
  generatedAt: string
}

// ── Singleton Prisma client for the worker process ────────────────────────────
const prisma = new PrismaClient()

const WORKSPACE_BASE =
  process.env.BOT_WORKSPACE_BASE ?? '/var/botforge/bots'

// ── Processor ─────────────────────────────────────────────────────────────────

/**
 * Full deploy pipeline for a single bot project:
 *
 *  1.  Mark DeploymentJob as RUNNING
 *  2.  Load project + GeneratedVersion snapshot + BotConfig + BotSecret from DB
 *  3.  Stop any running PM2 process for this project
 *  4.  Clean (delete) the old workspace directory
 *  5.  Create a fresh workspace directory
 *  6.  Write generated source files to workspace
 *  7.  Build .env from merged plain config + secrets — the ONLY place secrets touch disk
 *  8.  npm install (production + dev deps for TS compile)
 *  9.  npm run build (tsc → dist/)
 * 10.  Start bot via PM2
 * 11.  Mark DeploymentJob SUCCESS + BotProject LIVE
 *
 * On any failure: mark DeploymentJob FAILED + BotProject FAILED.
 */
export async function handleDeployProject(
  job: Job<DeployProjectJobPayload>,
): Promise<void> {
  const { projectId, deploymentJobId } = job.data
  const label = `deploy:${projectId.slice(0, 8)}`

  console.log(`[${label}] Starting deploy — job=${job.id} deploymentJob=${deploymentJobId}`)

  // Step 1: Mark RUNNING
  await prisma.deploymentJob.update({
    where: { id: deploymentJobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  try {
    // Step 2: Load all required records (BotSecret loaded alongside BotConfig)
    const [project, generatedVersion, botConfig, botSecret] = await Promise.all([
      prisma.botProject.findUnique({ where: { id: projectId } }),
      prisma.generatedVersion.findUnique({ where: { projectId } }),
      prisma.botConfig.findUnique({ where: { projectId } }),
      prisma.botSecret.findUnique({ where: { projectId } }),
    ])

    if (!project) throw new Error(`Project ${projectId} not found`)
    if (!generatedVersion) throw new Error('No generated snapshot found — run Generate first')
    if (!botConfig) throw new Error('Bot config missing — cannot build .env')

    const snapshot = generatedVersion.sourceJson as unknown as SourceSnapshot
    if (!snapshot.files?.length) throw new Error('Snapshot contains no files')
    if (!snapshot.envMapping) throw new Error('Snapshot missing envMapping')

    // Derive workspace path and PM2 process name up-front (needed for cleanup steps)
    const workspacePath = getWorkspacePath(WORKSPACE_BASE, projectId)
    const pm2Name = `bot-${projectId}`

    // Step 3: Stop any previously running PM2 process for this project
    console.log(`[${label}] Stopping existing PM2 process "${pm2Name}" (if any)…`)
    await stopBotProcess(pm2Name)

    // Step 4: Clean the old workspace so no stale files or .env linger
    console.log(`[${label}] Cleaning workspace: ${workspacePath}`)
    await cleanWorkspace(workspacePath)

    // Step 5: Create a fresh workspace
    await createWorkspace(workspacePath)
    console.log(`[${label}] Workspace ready`)

    // Step 6: Write generated source files (no secrets in these files)
    await writeGeneratedFiles(workspacePath, snapshot.files)
    console.log(`[${label}] Wrote ${snapshot.files.length} source files`)

    // Step 7: Build .env — merge plain config with decrypted secrets
    // BotSecret stores secrets encrypted; decrypt here, use immediately, never log.
    // For legacy records where BotSecret doesn't exist, secrets may still be in BotConfig.
    const encKey = process.env.BOT_SECRET_ENCRYPTION_KEY
    if (!encKey) throw new Error('BOT_SECRET_ENCRYPTION_KEY is not set — cannot decrypt secrets')

    const plainConfigData = botConfig.configData as Record<string, unknown>
    const rawSecretData = (botSecret?.secretData ?? {}) as Record<string, unknown>
    const secretData = Object.keys(rawSecretData).length > 0
      ? decryptSecretData(rawSecretData, encKey)
      : {}
    const allConfigData = { ...plainConfigData, ...secretData }
    const envContent = buildEnvFileContent(allConfigData, snapshot.envMapping)
    await writeEnvFile(workspacePath, envContent)
    console.log(`[${label}] Wrote .env (${Object.keys(snapshot.envMapping).length} vars)`)

    // Step 8: Install dependencies
    console.log(`[${label}] Running npm install…`)
    await runCommand('npm', ['install'], workspacePath, label)
    console.log(`[${label}] Dependencies installed`)

    // Step 9: Compile TypeScript
    console.log(`[${label}] Running npm run build…`)
    await runCommand('npm', ['run', 'build'], workspacePath, label)
    console.log(`[${label}] Build complete`)

    // Step 10: Start bot process under PM2
    console.log(`[${label}] Starting PM2 process "${pm2Name}"…`)
    await startBotProcess(pm2Name, workspacePath)
    console.log(`[${label}] PM2 process started`)

    // Step 11: Mark success
    await prisma.$transaction([
      prisma.deploymentJob.update({
        where: { id: deploymentJobId },
        data: {
          status: 'SUCCESS',
          pm2Name,
          workspacePath,
          finishedAt: new Date(),
        },
      }),
      prisma.botProject.update({
        where: { id: projectId },
        data: { status: 'LIVE' },
      }),
    ])

    console.log(`[${label}] Deploy complete — bot is LIVE`)

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[${label}] Deploy failed: ${errorMsg}`)

    // Mark failure — don't let this secondary update shadow the original error
    await prisma.$transaction([
      prisma.deploymentJob.update({
        where: { id: deploymentJobId },
        data: {
          status: 'FAILED',
          errorMsg: errorMsg.slice(0, 2000), // cap to fit column
          finishedAt: new Date(),
        },
      }),
      prisma.botProject.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      }),
    ]).catch((updateErr) => {
      // Log but don't throw — original error is more important
      console.error(`[${label}] Failed to persist failure status:`, updateErr)
    })

    // Re-throw so BullMQ marks the job as failed and can retry if configured
    throw err
  }
}
