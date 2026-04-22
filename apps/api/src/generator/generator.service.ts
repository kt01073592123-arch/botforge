import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { ProjectsService } from '../projects/projects.service'
import { PaymentsService } from '../payments/payments.service'
import { getTemplateDef } from '@botforge/templates'
import type { TemplateFile } from '@botforge/templates'
import type { GeneratedVersion } from '@prisma/client'
import { AuditService, AuditEventType } from '../audit/audit.service'
import { decryptSecretData } from '../lib/crypto'
import { logEvent, logError } from '../lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SourceSnapshot {
  files: TemplateFile[]
  envVars: string[]
  envMapping: Record<string, string>
  templateKey: string
  generatedAt: string
}

export interface GenerationSummary {
  id: string
  versionNumber: number
  templateKey: string
  fileCount: number
  filePaths: string[]
  envVars: string[]
  generatedAt: string
  createdAt: Date
  updatedAt: Date
}

/** Returned by the preview endpoint — includes file contents */
export interface GenerationPreview {
  templateKey: string
  fileCount: number
  files: Array<{ path: string; size: number; preview: string }>
  envVars: string[]
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly paymentsService: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  // ── POST /projects/:id/generate ────────────────────────────────────────────

  async generate(projectId: string, userId: string): Promise<GenerationSummary> {
    // 1. Payment gate
    await this.paymentsService.assertPaid(userId)

    // 2-5. Resolve config + template + validate
    const { templateDef, mergedConfig, project } = await this.resolveAndValidate(projectId, userId)

    // 6. Generate files
    const files = this.renderFiles(templateDef, mergedConfig, project.templateKey!, userId, projectId)

    // 7. Build snapshot
    const snapshot = this.buildSnapshot(files, templateDef, project.templateKey!)

    // 8. Persist
    const generatedVersion = await this.persistSnapshot(projectId, project.templateKey!, snapshot)

    logEvent(this.logger, 'generate.ok', {
      userId, projectId,
      templateKey: project.templateKey!,
      version: generatedVersion.versionNumber,
      fileCount: files.length,
    })
    void this.audit.record({
      actorUserId: userId,
      eventType: AuditEventType.GENERATE_TRIGGERED,
      entityType: 'project',
      entityId: projectId,
      metadata: {
        templateKey: project.templateKey!,
        versionNumber: generatedVersion.versionNumber,
        fileCount: files.length,
      },
    })

    return this.toSummary(generatedVersion)
  }

  // ── GET /projects/:id/generated ────────────────────────────────────────────

  async getGenerated(projectId: string, userId: string): Promise<GenerationSummary | null> {
    await this.projectsService.findOneByUser(projectId, userId)
    const record = await this.prisma.generatedVersion.findUnique({ where: { projectId } })
    if (!record) return null
    return this.toSummary(record)
  }

  // ── GET /projects/:id/preview ──────────────────────────────────────────────

  async preview(projectId: string, userId: string): Promise<GenerationPreview> {
    const { templateDef, mergedConfig, project } = await this.resolveAndValidate(projectId, userId)
    const files = this.renderFiles(templateDef, mergedConfig, project.templateKey!, userId, projectId)
    const envVars = Object.keys(templateDef.envMapping).sort()

    return {
      templateKey: project.templateKey!,
      fileCount: files.length,
      files: files.map(f => ({
        path: f.path,
        size: f.content.length,
        // First 200 lines — enough to review without flooding the response
        preview: f.content.split('\n').slice(0, 200).join('\n'),
      })),
      envVars,
    }
  }

  // ── Private: resolve config + template + merge secrets + validate ──────────

  private async resolveAndValidate(projectId: string, userId: string) {
    const project = await this.projectsService.findOneByUser(projectId, userId)

    if (!project.templateKey) {
      throw new BadRequestException('Assign a template before generating')
    }

    const botConfig = await this.prisma.botConfig.findUnique({ where: { projectId } })
    if (!botConfig) {
      throw new BadRequestException('Save your bot configuration before generating')
    }

    const templateDef = getTemplateDef(project.templateKey)
    if (!templateDef) {
      throw new BadRequestException(`Template "${project.templateKey}" not found in registry`)
    }
    if (!templateDef.getFiles) {
      throw new BadRequestException(`Template "${project.templateKey}" does not support generation`)
    }

    // Merge plain config + decrypted secrets
    const plainData = botConfig.configData as Record<string, unknown>
    let mergedConfig: Record<string, unknown> = { ...plainData }

    const encKey = this.config.get<string>('app.secretEncryptionKey')
    if (encKey) {
      const botSecret = await this.prisma.botSecret.findUnique({ where: { projectId } })
      if (botSecret) {
        const secrets = decryptSecretData(botSecret.secretData as Record<string, unknown>, encKey)
        mergedConfig = { ...mergedConfig, ...secrets }
      }
    }

    // Validate merged config against template schema
    const validation = templateDef.schema.safeParse(mergedConfig)
    if (!validation.success) {
      throw new BadRequestException({
        message: 'Saved config no longer passes validation. Please update your config.',
        errors: validation.error.flatten().fieldErrors,
      })
    }

    return {
      project,
      templateDef,
      mergedConfig: validation.data as Record<string, unknown>,
    }
  }

  // ── Private: render files ──────────────────────────────────────────────────

  private renderFiles(
    templateDef: NonNullable<ReturnType<typeof getTemplateDef>>,
    config: Record<string, unknown>,
    templateKey: string,
    userId: string,
    projectId: string,
  ): TemplateFile[] {
    try {
      return templateDef.getFiles!(config)
    } catch (err) {
      logError(this.logger, 'generate.render_failed', { userId, projectId, templateKey }, err)
      void this.audit.record({
        actorUserId: userId,
        eventType: AuditEventType.GENERATE_FAILED,
        entityType: 'project',
        entityId: projectId,
        metadata: { templateKey, error: err instanceof Error ? err.message : String(err) },
      })
      throw new InternalServerErrorException('Source generation failed')
    }
  }

  // ── Private: build snapshot ────────────────────────────────────────────────

  private buildSnapshot(
    files: TemplateFile[],
    templateDef: NonNullable<ReturnType<typeof getTemplateDef>>,
    templateKey: string,
  ): SourceSnapshot {
    // Env vars: take from envMapping (authoritative) + scan generated code for extras
    const mappedVars = Object.keys(templateDef.envMapping)
    const scannedVars = extractEnvVarNames(files)
    const allVars = [...new Set([...mappedVars, ...scannedVars])].sort()

    return {
      files,
      envVars: allVars,
      envMapping: templateDef.envMapping,
      templateKey,
      generatedAt: new Date().toISOString(),
    }
  }

  // ── Private: persist to DB ─────────────────────────────────────────────────

  private async persistSnapshot(
    projectId: string,
    templateKey: string,
    snapshot: SourceSnapshot,
  ) {
    const [generatedVersion] = await this.prisma.$transaction([
      this.prisma.generatedVersion.upsert({
        where: { projectId },
        create: {
          projectId,
          templateKey,
          sourceJson: snapshot as object,
          versionNumber: 1,
        },
        update: {
          sourceJson: snapshot as object,
          templateKey,
          versionNumber: { increment: 1 },
        },
      }),
      this.prisma.botProject.update({
        where: { id: projectId },
        data: { status: 'GENERATED' },
      }),
    ])
    return generatedVersion
  }

  // ── Private: summary builder ───────────────────────────────────────────────

  private toSummary(record: GeneratedVersion): GenerationSummary {
    const snapshot = record.sourceJson as unknown as SourceSnapshot
    return {
      id: record.id,
      versionNumber: record.versionNumber,
      templateKey: record.templateKey,
      fileCount: snapshot.files.length,
      filePaths: snapshot.files.map((f) => f.path),
      envVars: snapshot.envVars,
      generatedAt: snapshot.generatedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────

function extractEnvVarNames(files: TemplateFile[]): string[] {
  const pattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g
  const found = new Set<string>()
  for (const file of files) {
    for (const match of file.content.matchAll(pattern)) {
      found.add(match[1])
    }
  }
  return [...found].sort()
}
