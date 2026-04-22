/**
 * Stale-resource cleanup utility.
 *
 * Removes workspace directories and PM2 processes that no longer correspond
 * to a project in LIVE, DEPLOYING, or FAILED state. Run manually on the VPS
 * whenever you want to reclaim disk/process space.
 *
 * Usage (from the worker app directory):
 *   BOT_WORKSPACE_BASE=/var/botforge/bots \
 *   DATABASE_URL=postgresql://... \
 *   npx ts-node src/scripts/cleanup.ts
 *
 * Or after compiling:
 *   node dist/scripts/cleanup.js
 */

import { PrismaClient } from '@prisma/client'
import { cleanupStaleWorkspaces } from '../lib/workspace'
import { cleanupOrphanProcesses } from '../lib/pm2-manager'

const WORKSPACE_BASE = process.env.BOT_WORKSPACE_BASE ?? '/var/botforge/bots'

function log(event: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...ctx }))
}

function logErr(event: string, ctx: Record<string, unknown> = {}, err?: unknown): void {
  const error = err instanceof Error ? err.message : err != null ? String(err) : undefined
  console.error(JSON.stringify({ event, ts: new Date().toISOString(), ...ctx, ...(error !== undefined ? { error } : {}) }))
}

async function main(): Promise<void> {
  const prisma = new PrismaClient()

  try {
    // Keep workspaces and PM2 processes for projects that have ever been deployed
    const projects = await prisma.botProject.findMany({
      where: { status: { in: ['LIVE', 'DEPLOYING', 'FAILED'] } },
      select: { id: true },
    })
    const activeIds = new Set(projects.map((p) => p.id))
    log('cleanup.start', { activeProjects: activeIds.size })

    // Clean stale workspace directories
    const wsResult = await cleanupStaleWorkspaces(WORKSPACE_BASE, activeIds)
    log('cleanup.workspaces', {
      removed: wsResult.removed.length,
      removedPaths: wsResult.removed,
      errors: wsResult.errors,
    })

    // Clean orphan PM2 processes
    const pm2Result = await cleanupOrphanProcesses(activeIds)
    log('cleanup.pm2', {
      removed: pm2Result.removed.length,
      removedNames: pm2Result.removed,
      errors: pm2Result.errors,
    })

    const allErrors = [...wsResult.errors, ...pm2Result.errors]
    log('cleanup.done', {
      workspacesRemoved: wsResult.removed.length,
      pm2Removed: pm2Result.removed.length,
      errorCount: allErrors.length,
    })

    // Write audit event directly — cleanup runs outside the NestJS DI context
    await prisma.auditEvent.create({
      data: {
        actorUserId: null,
        eventType: 'CLEANUP_RUN',
        entityType: 'system',
        entityId: 'cleanup',
        metadata: {
          workspacesRemoved: wsResult.removed.length,
          pm2Removed: pm2Result.removed.length,
          errors: allErrors,
        },
      },
    })

  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  logErr('cleanup.fatal', {}, err)
  process.exit(1)
})
