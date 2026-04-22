import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { isValidTemplateKey, getTemplateDef } from '@botforge/templates'
import { encryptSecretData, decryptSecretData } from '../lib/crypto'
import { CreateProjectDto } from './dto/create-project.dto'
import { AssignTemplateDto } from './dto/assign-template.dto'
import { SaveConfigDto } from './dto/save-config.dto'

// Minimal shape we extract from GeneratedVersion.sourceJson
// (sourceJson is stored as Json — typed here only for extraction)
interface SnapMeta {
  files: Array<{ path: string }>
  envVars: string[]
  generatedAt: string
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns the encryption key, throwing clearly if it is not configured.
   * Called only on paths that read or write secrets.
   */
  private getEncryptionKey(): string {
    const key = this.config.get<string>('app.secretEncryptionKey')
    if (!key) {
      throw new BadRequestException(
        'BOT_SECRET_ENCRYPTION_KEY is not set — cannot read or write secrets',
      )
    }
    return key
  }

  create(userId: string, dto: CreateProjectDto) {
    return this.prisma.botProject.create({
      data: { userId, name: dto.name },
    })
  }

  // List enriched with summary data — dashboard cards need no extra calls
  findAllByUser(userId: string) {
    return this.prisma.botProject.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        config: { select: { id: true, validatedAt: true } },
        generatedVersion: { select: { versionNumber: true, updatedAt: true } },
        deployments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { status: true, pm2Name: true, finishedAt: true },
        },
      },
    })
  }

  // Scopes the lookup to the requesting user — returns 404 for missing OR wrong-user
  // to avoid leaking resource existence.
  async findOneByUser(id: string, userId: string) {
    const project = await this.prisma.botProject.findFirst({
      where: { id, userId },
    })
    if (!project) throw new NotFoundException('Project not found')
    return project
  }

  // GET /projects/:id/overview — full dashboard state in a single round-trip.
  // Aggregates project + config + generation + deployment + payment into one response.
  // Never exposes: config secrets, raw file contents, workspace paths.
  async getOverview(id: string, userId: string) {
    const project = await this.prisma.botProject.findFirst({
      where: { id, userId },
      include: {
        config: { select: { id: true, validatedAt: true, updatedAt: true } },
        generatedVersion: true,
        deployments: { take: 1, orderBy: { createdAt: 'desc' } },
        user: { select: { hasPaid: true } },
      },
    })
    if (!project) throw new NotFoundException('Project not found')

    const { user, config, generatedVersion, deployments, ...base } = project
    const latestDeploy = deployments[0] ?? null
    const snap = generatedVersion?.sourceJson as SnapMeta | null

    return {
      id: base.id,
      name: base.name,
      status: base.status,
      templateKey: base.templateKey,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      config: {
        exists: !!config,
        validatedAt: config?.validatedAt?.toISOString() ?? null,
        updatedAt: config?.updatedAt?.toISOString() ?? null,
      },
      generation: snap && generatedVersion
        ? {
            versionNumber: generatedVersion.versionNumber,
            fileCount: snap.files.length,
            filePaths: snap.files.map((f) => f.path),
            envVars: snap.envVars,
            generatedAt: snap.generatedAt,
            updatedAt: generatedVersion.updatedAt.toISOString(),
          }
        : null,
      latestDeployment: latestDeploy
        ? {
            id: latestDeploy.id,
            status: latestDeploy.status,
            pm2Name: latestDeploy.pm2Name,
            // errorMsg → errorMessage for consistent frontend naming
            errorMessage: latestDeploy.errorMsg,
            startedAt: latestDeploy.startedAt?.toISOString() ?? null,
            finishedAt: latestDeploy.finishedAt?.toISOString() ?? null,
            createdAt: latestDeploy.createdAt.toISOString(),
          }
        : null,
      payment: {
        hasPaid: user.hasPaid || this.config.get<boolean>('app.disablePayments') === true,
      },
    }
  }

  // PATCH /projects/:id — rename project
  async rename(id: string, userId: string, name: string) {
    await this.findOneByUser(id, userId)
    return this.prisma.botProject.update({
      where: { id },
      data: { name },
    })
  }

  // DELETE /projects/:id — delete project and all related data
  async remove(id: string, userId: string) {
    await this.findOneByUser(id, userId)

    // Delete in correct order (foreign key constraints)
    await this.prisma.$transaction([
      this.prisma.deploymentJob.deleteMany({ where: { projectId: id } }),
      this.prisma.generatedVersion.deleteMany({ where: { projectId: id } }),
      this.prisma.botSecret.deleteMany({ where: { projectId: id } }),
      this.prisma.botConfig.deleteMany({ where: { projectId: id } }),
      this.prisma.botProject.delete({ where: { id } }),
    ])

    return { deleted: true }
  }

  // PATCH /projects/:id/template
  async assignTemplate(id: string, userId: string, dto: AssignTemplateDto) {
    await this.findOneByUser(id, userId)
    if (!isValidTemplateKey(dto.templateKey)) {
      throw new BadRequestException(`Unknown template key: ${dto.templateKey}`)
    }
    return this.prisma.botProject.update({
      where: { id },
      data: { templateKey: dto.templateKey },
    })
  }

  // GET /projects/:id/config
  // Returns configData with secret fields (envMapping values) replaced by '__MASKED__'.
  // Secrets are decrypted only to check which fields exist, then immediately discarded.
  async getConfig(id: string, userId: string) {
    const project = await this.findOneByUser(id, userId)
    const config = await this.prisma.botConfig.findUnique({ where: { projectId: id } })
    if (!config) return { configData: null }

    // Identify secret field names from this template's envMapping
    const secretFields = new Set<string>()
    if (project.templateKey) {
      const templateDef = getTemplateDef(project.templateKey)
      if (templateDef) {
        for (const field of Object.values(templateDef.envMapping)) {
          secretFields.add(field)
        }
      }
    }

    // Only touch encryption if there are secret fields to check
    const rawConfigData = config.configData as Record<string, unknown>
    const maskedConfigData: Record<string, unknown> = { ...rawConfigData }

    if (secretFields.size > 0) {
      const botSecret = await this.prisma.botSecret.findUnique({ where: { projectId: id } })

      // Decrypt stored secrets to know which fields have saved values.
      // If the encryption key is not configured, we can still mask any legacy
      // secrets that remain in plaintext configData — just skip the vault.
      let storedSecrets: Record<string, unknown> = {}
      const encKeyRaw = this.config.get<string>('app.secretEncryptionKey')
      if (botSecret && encKeyRaw) {
        storedSecrets = decryptSecretData(botSecret.secretData as Record<string, unknown>, encKeyRaw)
      }

      for (const field of secretFields) {
        // Mask if the field has a value in BotSecret (encrypted) or legacy configData
        if (storedSecrets[field] !== undefined || rawConfigData[field] !== undefined) {
          maskedConfigData[field] = '__MASKED__'
        }
      }
    }

    return { ...config, configData: maskedConfigData }
  }

  // PUT /projects/:id/config
  // Splits validated data into plain fields (→ BotConfig) and secret fields (→ BotSecret).
  // '__MASKED__' values are substituted with the existing stored secret before validation,
  // so users can save non-secret changes without re-entering their credentials.
  async saveConfig(id: string, userId: string, dto: SaveConfigDto) {
    const project = await this.findOneByUser(id, userId)
    if (!project.templateKey) {
      throw new BadRequestException('Assign a template before saving config')
    }
    const templateDef = getTemplateDef(project.templateKey)
    if (!templateDef) {
      throw new BadRequestException(`Template "${project.templateKey}" no longer exists`)
    }

    // Identify the secret field names for this template
    const secretFieldNames = new Set<string>(Object.values(templateDef.envMapping))

    const encKey = this.getEncryptionKey()

    // Load and decrypt existing secrets so '__MASKED__' can be substituted before validation
    const existingSecret = await this.prisma.botSecret.findUnique({ where: { projectId: id } })
    const existingSecretData = existingSecret
      ? decryptSecretData(existingSecret.secretData as Record<string, unknown>, encKey)
      : {}

    // Merge: replace '__MASKED__' with the stored secret value (or '' if no existing value)
    const mergedConfig: Record<string, unknown> = { ...dto.config }
    for (const field of secretFieldNames) {
      if (mergedConfig[field] === '__MASKED__') {
        mergedConfig[field] = existingSecretData[field] ?? ''
      }
    }

    const result = templateDef.schema.safeParse(mergedConfig)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Config validation failed',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const validated = result.data as Record<string, unknown>

    // Split into plain (non-sensitive) and secret fields
    const plainData: Record<string, unknown> = {}
    const secretData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(validated)) {
      if (secretFieldNames.has(key)) {
        secretData[key] = value
      } else {
        plainData[key] = value
      }
    }

    // Encrypt secret fields before persistence — plaintext never touches the DB
    const encryptedSecretData = encryptSecretData(secretData, encKey)

    // Persist atomically: upsert BotConfig (plain) + BotSecret (encrypted)
    const [savedConfig] = await this.prisma.$transaction([
      this.prisma.botConfig.upsert({
        where: { projectId: id },
        create: { projectId: id, configData: plainData as object, validatedAt: new Date() },
        update: { configData: plainData as object, validatedAt: new Date() },
      }),
      this.prisma.botSecret.upsert({
        where: { projectId: id },
        create: { projectId: id, secretData: encryptedSecretData },
        update: { secretData: encryptedSecretData },
      }),
    ])

    return savedConfig
  }
}
