import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// ── Stable event-type constants ────────────────────────────────────────────────
// String values — avoids adding a DB enum (no migration when new types are added).
// Keep names SCREAMING_SNAKE, noun-first so they sort and grep cleanly.

export const AuditEventType = {
  AUTH_REGISTER_OK:          'AUTH_REGISTER_OK',
  AUTH_REGISTER_CONFLICT:    'AUTH_REGISTER_CONFLICT',
  AUTH_LOGIN_OK:             'AUTH_LOGIN_OK',
  AUTH_LOGIN_FAIL:           'AUTH_LOGIN_FAIL',
  PAYMENT_CHECKOUT_CREATED:  'PAYMENT_CHECKOUT_CREATED',
  PAYMENT_CONFIRMED:         'PAYMENT_CONFIRMED',
  GENERATE_TRIGGERED:        'GENERATE_TRIGGERED',
  GENERATE_FAILED:           'GENERATE_FAILED',
  DEPLOY_TRIGGERED:          'DEPLOY_TRIGGERED',
  ADMIN_REDEPLOY:            'ADMIN_REDEPLOY',
  ADMIN_MIGRATE_SECRETS:     'ADMIN_MIGRATE_SECRETS',
  CLEANUP_RUN:               'CLEANUP_RUN',
} as const

export type AuditEventType = typeof AuditEventType[keyof typeof AuditEventType]

export interface RecordAuditInput {
  /** null for system / webhook-initiated events */
  actorUserId?: string | null
  eventType: AuditEventType
  entityType: string   // "user", "project", "payment", "system"
  entityId: string
  /** Safe, non-secret context — no tokens, no raw secrets */
  metadata?: Record<string, unknown>
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit event.
   *
   * Always call with `void` — this method is intentionally fire-and-log:
   *   void this.audit.record({ ... })
   *
   * Internal failures are caught and logged; the main flow is never blocked.
   * Never include secrets, tokens, or raw .env values in metadata.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          eventType:   input.eventType,
          entityType:  input.entityType,
          entityId:    input.entityId,
          metadata:    (input.metadata ?? {}) as object,
        },
      })
    } catch (err) {
      this.logger.error(
        `Audit write failed [${input.eventType}/${input.entityId}]: ` +
          (err instanceof Error ? err.message : String(err)),
      )
    }
  }
}
