import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { ProjectsService } from '../projects/projects.service'
import { PaymentsService } from '../payments/payments.service'
import { AuditService, AuditEventType } from '../audit/audit.service'
import { logEvent } from '../lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

// Returned to the frontend — no secrets, no raw paths unless debugging
export interface DeploymentSummary {
  id: string
  status: string
  pm2Name: string | null
  errorMessage: string | null
  startedAt: Date | null
  finishedAt: Date | null
  createdAt: Date
  // workspacePath intentionally omitted from the public response
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly paymentsService: PaymentsService,
    private readonly audit: AuditService,
    @InjectQueue('bot-pipeline') private readonly queue: Queue,
  ) {}

  // POST /api/v1/projects/:id/deploy
  async triggerDeploy(projectId: string, userId: string): Promise<DeploymentSummary> {
    // 1. Payment gate — throws 402 if user has not paid
    await this.paymentsService.assertPaid(userId)

    // 2. Ownership check (throws 404 for missing or wrong-user)
    const project = await this.projectsService.findOneByUser(projectId, userId)

    // 3. Must have a generated snapshot
    const generatedVersion = await this.prisma.generatedVersion.findUnique({
      where: { projectId },
    })
    if (!generatedVersion) {
      throw new BadRequestException('Generate the bot source before deploying')
    }

    // 4. Must have saved config (worker needs it to build the .env)
    const botConfig = await this.prisma.botConfig.findUnique({
      where: { projectId },
    })
    if (!botConfig) {
      throw new BadRequestException('Bot configuration is missing')
    }

    // 5. Create DeploymentJob record + update project status atomically
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

    // 6. Enqueue the BullMQ job
    const bullJob = await this.queue.add('deploy-project', {
      projectId,
      userId,
      deploymentJobId: deploymentJob.id,
    })

    // 7. Store the BullMQ job ID for traceability
    await this.prisma.deploymentJob.update({
      where: { id: deploymentJob.id },
      data: { bullJobId: String(bullJob.id) },
    })

    logEvent(this.logger, 'deploy.triggered', {
      userId,
      projectId,
      deploymentJobId: deploymentJob.id,
      bullJobId: String(bullJob.id),
    })
    void this.audit.record({
      actorUserId: userId,
      eventType: AuditEventType.DEPLOY_TRIGGERED,
      entityType: 'project',
      entityId: projectId,
      metadata: { deploymentJobId: deploymentJob.id, bullJobId: String(bullJob.id) },
    })

    return this.toSummary(deploymentJob)
  }

  // GET /api/v1/projects/:id/deploy
  async getLatestDeploy(projectId: string, userId: string): Promise<DeploymentSummary> {
    await this.projectsService.findOneByUser(projectId, userId)

    const job = await this.prisma.deploymentJob.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })

    if (!job) {
      throw new NotFoundException('No deployment found for this project')
    }

    return this.toSummary(job)
  }

  // GET /api/v1/projects/:id/deploys — deploy history (last 20)
  async getDeployHistory(projectId: string, userId: string): Promise<DeploymentSummary[]> {
    await this.projectsService.findOneByUser(projectId, userId)

    const jobs = await this.prisma.deploymentJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return jobs.map((j) => this.toSummary(j))
  }

  // POST /api/v1/projects/:id/stop — stop a live bot
  async stopBot(projectId: string, userId: string): Promise<{ stopped: boolean }> {
    const project = await this.projectsService.findOneByUser(projectId, userId)

    if (project.status !== 'LIVE' && project.status !== 'FAILED') {
      throw new BadRequestException('Bot is not running')
    }

    await this.prisma.botProject.update({
      where: { id: projectId },
      data: { status: 'GENERATED' },
    })

    logEvent(this.logger, 'bot.stopped', { userId, projectId })
    void this.audit.record({
      actorUserId: userId,
      eventType: AuditEventType.DEPLOY_TRIGGERED,
      entityType: 'project',
      entityId: projectId,
      metadata: { action: 'stop' },
    })

    return { stopped: true }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private toSummary(job: {
    id: string
    status: string
    pm2Name: string | null
    errorMsg: string | null
    startedAt: Date | null
    finishedAt: Date | null
    createdAt: Date
  }): DeploymentSummary {
    return {
      id: job.id,
      status: job.status,
      pm2Name: job.pm2Name,
      errorMessage: job.errorMsg,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
    }
  }
}
