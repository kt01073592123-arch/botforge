import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import type { SafeUser } from '../auth/auth.types'
import { AuditService, AuditEventType } from '../audit/audit.service'
import { logEvent, logWarn, logError } from '../lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentStatus {
  hasPaid: boolean
  // If hasPaid is false, redirectUrl guides the user to pay
  checkoutUrl?: string
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly stripe: Stripe
  private readonly webhookSecret: string
  private readonly priceCents: number
  private readonly productName: string
  private readonly frontendUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    const secretKey = this.config.get<string>('app.stripe.secretKey', '')
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not set — payments will not work')
    }

    this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })
    this.webhookSecret = this.config.get<string>('app.stripe.webhookSecret', '')
    this.priceCents = this.config.get<number>('app.stripe.priceCents', 999)
    this.productName = this.config.get<string>('app.stripe.productName', 'BotForge Access')
    this.frontendUrl = this.config.get<string>('app.frontendUrl', 'http://localhost:3000')
  }

  // ── POST /payments/checkout-session ─────────────────────────────────────────

  async createCheckoutSession(user: SafeUser): Promise<{ url: string }> {
    if (user.hasPaid) {
      // Already paid — no need to charge again
      throw new HttpException('Already paid', HttpStatus.CONFLICT)
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: this.priceCents,
            product_data: {
              name: this.productName,
              description: 'One-time payment — generate and deploy unlimited Telegram bots',
            },
          },
          quantity: 1,
        },
      ],
      // userId stored in metadata so the webhook can map the session back to the user
      metadata: { userId: user.id },
      success_url: `${this.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/payment/cancel`,
    })

    // Create a PENDING payment record so we can track the checkout attempt
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        stripeSessionId: session.id,
        amountCents: this.priceCents,
        currency: 'usd',
        status: 'PENDING',
      },
    })

    logEvent(this.logger, 'payment.checkout.created', { userId: user.id, sessionId: session.id })
    void this.audit.record({
      actorUserId: user.id,
      eventType: AuditEventType.PAYMENT_CHECKOUT_CREATED,
      entityType: 'payment',
      entityId: session.id,
      metadata: { amountCents: this.priceCents },
    })
    return { url: session.url! }
  }

  // ── GET /payments/me ─────────────────────────────────────────────────────────

  async getStatus(userId: string): Promise<PaymentStatus> {
    return { hasPaid: await this.isEffectivelyPaid(userId) }
  }

  // ── POST /payments/webhook ───────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.webhookSecret) {
      throw new UnauthorizedException('Webhook secret not configured')
    }

    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
    } catch (err) {
      logWarn(this.logger, 'payment.webhook.sig_invalid', { error: err instanceof Error ? err.message : 'Invalid signature' })
      throw new UnauthorizedException(`Webhook signature invalid: ${err instanceof Error ? err.message : 'Invalid signature'}`)
    }

    logEvent(this.logger, 'payment.webhook.received', { eventType: event.type, eventId: event.id })

    if (event.type === 'checkout.session.completed') {
      try {
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id,
        )
      } catch (err) {
        // Log and swallow so we always return 200 — Stripe retries on non-2xx.
        logError(this.logger, 'payment.webhook.process_error', { eventId: event.id }, err)
      }
    }
    // Other event types silently acknowledged — return 200 so Stripe stops retrying
  }

  // ── Payment enforcement (called by GeneratorService + DeployService) ─────────

  /**
   * Single source of truth: has this user effectively paid?
   * Returns true if the user has paid OR if DISABLE_PAYMENTS=true.
   * Used by assertPaid(), getStatus(), and available to other services (e.g. overview).
   */
  async isEffectivelyPaid(userId: string): Promise<boolean> {
    if (this.config.get<boolean>('app.disablePayments')) {
      return true
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasPaid: true },
    })
    return user?.hasPaid ?? false
  }

  /**
   * Throws 402 Payment Required if the user has not paid.
   * This is the single enforcement point for the payment gate.
   */
  async assertPaid(userId: string): Promise<void> {
    if (await this.isEffectivelyPaid(userId)) {
      return
    }
    throw new HttpException(
      'Payment required — please complete checkout before generating or deploying bots.',
      HttpStatus.PAYMENT_REQUIRED, // 402
    )
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    stripeEventId: string,
  ): Promise<void> {
    const userId = session.metadata?.userId
    if (!userId) {
      logError(this.logger, 'payment.webhook.no_user_metadata', { sessionId: session.id, stripeEventId })
      return
    }

    // Only process sessions where payment was actually collected
    if (session.payment_status !== 'paid') {
      logWarn(this.logger, 'payment.webhook.not_paid', { sessionId: session.id, paymentStatus: session.payment_status, stripeEventId })
      return
    }

    // Primary idempotency check: Stripe event ID is unique per event delivery.
    // A second delivery of the same event (Stripe retry) is safely skipped here.
    const alreadyProcessed = await this.prisma.payment.findUnique({
      where: { stripeEventId },
      select: { id: true },
    })
    if (alreadyProcessed) {
      logEvent(this.logger, 'payment.webhook.duplicate', { stripeEventId })
      return
    }

    const sessionId = session.id
    const paymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null

    // Atomically: upsert payment record (protected by stripeSessionId @unique) + mark user paid.
    // The @unique constraint on stripeSessionId makes the upsert safe under concurrent delivery.
    await this.prisma.$transaction([
      this.prisma.payment.upsert({
        where: { stripeSessionId: sessionId },
        create: {
          userId,
          stripeSessionId: sessionId,
          stripeEventId,
          stripePaymentIntentId: paymentIntentId,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
          status: 'PAID',
        },
        update: {
          status: 'PAID',
          stripeEventId,
          stripePaymentIntentId: paymentIntentId,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { hasPaid: true },
      }),
    ])

    logEvent(this.logger, 'payment.confirmed', { userId, sessionId, stripeEventId })
    void this.audit.record({
      actorUserId: userId,
      eventType: AuditEventType.PAYMENT_CONFIRMED,
      entityType: 'payment',
      entityId: sessionId,
      metadata: { stripeEventId, amountCents: session.amount_total ?? 0 },
    })
  }
}
