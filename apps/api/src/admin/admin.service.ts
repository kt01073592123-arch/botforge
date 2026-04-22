import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { getTemplateDef } from '@botforge/templates'
import { encryptSecretData, decryptSecretData } from '../lib/crypto'
import { AuditService, AuditEventType } from '../audit/audit.service'
import { logEvent, logError } from '../lib/logger'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @InjectQueue('bot-pipeline') private readonly queue: Queue,
  ) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id:        true,
        email:     true,
        name:      true,
        role:      true,
        hasPaid:   true,
        createdAt: true,
        updatedAt: true,
        // passwordHash: never selected
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  listProjects() {
    return this.prisma.botProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        config: { select: { id: true } },
        generatedVersion: { select: { versionNumber: true } },
        deployments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { status: true, errorMsg: true },
        },
      },
    })
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  listPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
      },
    })
  }

  // ── Deployments ────────────────────────────────────────────────────────────
  // workspacePath is intentionally excluded — internal server path, never exposed.

  async listDeployments() {
    const jobs = await this.prisma.deploymentJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id:         true,
        status:     true,
        pm2Name:    true,
        errorMsg:   true,
        bullJobId:  true,
        startedAt:  true,
        finishedAt: true,
        createdAt:  true,
        updatedAt:  true,
        // workspacePath NOT selected
        project: {
          select: {
            id:          true,
            name:        true,
            templateKey: true,
            status:      true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    })
    return jobs
  }

  // ── Admin redeploy ─────────────────────────────────────────────────────────
  // Bypasses payment gate and ownership check — admin action only.
  // Requires: existing generated snapshot + saved bot config.

  async retriggerDeploy(projectId: string) {
    const project = await this.prisma.botProject.findUnique({
      where: { id: projectId },
      include: {
        generatedVersion: { select: { id: true } },
        config: { select: { id: true } },
      },
    })
    if (!project) throw new NotFoundException('Project not found')
    if (!project.generatedVersion) {
      throw new BadRequestException('Project has no generated snapshot — generate first')
    }
    if (!project.config) {
      throw new BadRequestException('Project has no bot config')
    }

    // Create DeploymentJob + update project status atomically
    const deploymentJob = await this.prisma.$transaction(async (tx) => {
      const job = await tx.deploymentJob.create({
        data: { projectId, status: 'QUEUED' },
      })
      await tx.botProject.update({
        where: { id: projectId },
        data: { status: 'DEPLOYING' },
      })
      return job
    })

    // Enqueue BullMQ job
    const bullJob = await this.queue.add('deploy-project', {
      projectId,
      userId: project.userId,
      deploymentJobId: deploymentJob.id,
    })

    await this.prisma.deploymentJob.update({
      where: { id: deploymentJob.id },
      data: { bullJobId: String(bullJob.id) },
    })

    logEvent(this.logger, 'admin.redeploy', {
      projectId,
      deploymentJobId: deploymentJob.id,
      bullJobId: String(bullJob.id),
    })
    void this.audit.record({
      eventType: AuditEventType.ADMIN_REDEPLOY,
      entityType: 'project',
      entityId: projectId,
      metadata: { deploymentJobId: deploymentJob.id, bullJobId: String(bullJob.id) },
    })

    return { ok: true, deploymentJobId: deploymentJob.id }
  }

  // ── One-time secret migration ──────────────────────────────────────────────
  // POST /admin/maintenance/migrate-secrets
  //
  // Finds BotConfig records that still contain raw secret values (fields listed
  // in the template's envMapping), moves them to encrypted BotSecret rows, and
  // strips them from BotConfig. Safe to run multiple times (idempotent).

  async migrateSecretsToVault(): Promise<{
    migrated: number
    skipped: number
    errors: string[]
  }> {
    const encKey = this.config.get<string>('app.secretEncryptionKey')
    if (!encKey) {
      throw new BadRequestException('BOT_SECRET_ENCRYPTION_KEY is not configured')
    }

    const projects = await this.prisma.botProject.findMany({
      where: { config: { isNot: null } },
      include: { config: true, secret: true },
    })

    let migrated = 0
    let skipped = 0
    const errors: string[] = []

    for (const project of projects) {
      try {
        if (!project.config || !project.templateKey) { skipped++; continue }

        const templateDef = getTemplateDef(project.templateKey)
        if (!templateDef) { skipped++; continue }

        const secretFieldNames = new Set(Object.values(templateDef.envMapping))
        const configData = project.config.configData as Record<string, unknown>

        // Collect secret fields still present in BotConfig
        const secretsToMove: Record<string, unknown> = {}
        for (const field of secretFieldNames) {
          if (configData[field] !== undefined) {
            secretsToMove[field] = configData[field]
          }
        }

        if (Object.keys(secretsToMove).length === 0) { skipped++; continue }

        // Merge with any existing BotSecret (existing record takes precedence — already migrated)
        const existingSecrets = project.secret
          ? decryptSecretData(project.secret.secretData as Record<string, unknown>, encKey)
          : {}
        const mergedSecrets = { ...secretsToMove, ...existingSecrets }

        // Strip secret fields from configData
        const cleanConfigData = { ...configData }
        for (const field of secretFieldNames) delete cleanConfigData[field]

        await this.prisma.$transaction([
          this.prisma.botConfig.update({
            where: { id: project.config.id },
            data: { configData: cleanConfigData as object },
          }),
          this.prisma.botSecret.upsert({
            where: { projectId: project.id },
            create: {
              projectId: project.id,
              secretData: encryptSecretData(mergedSecrets, encKey),
            },
            update: { secretData: encryptSecretData(mergedSecrets, encKey) },
          }),
        ])

        migrated++
        logEvent(this.logger, 'admin.migrate_secrets.project_ok', { projectId: project.id })
      } catch (err) {
        const msg = `Project ${project.id}: ${err instanceof Error ? err.message : String(err)}`
        errors.push(msg)
        logError(this.logger, 'admin.migrate_secrets.project_err', { projectId: project.id }, err)
      }
    }

    logEvent(this.logger, 'admin.migrate_secrets.done', { migrated, skipped, errorCount: errors.length })
    void this.audit.record({
      eventType: AuditEventType.ADMIN_MIGRATE_SECRETS,
      entityType: 'system',
      entityId: 'migrate-secrets',
      metadata: { migrated, skipped, errors },
    })

    return { migrated, skipped, errors }
  }
}
