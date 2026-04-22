import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SafeUser } from '../auth/auth.types'
import { PaymentsService } from './payments.service'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /api/v1/payments/checkout-session — 5 per minute per IP
  // Authenticated — creates a Stripe Checkout session for the current user.
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('checkout-session')
  @HttpCode(HttpStatus.CREATED)
  createCheckoutSession(@CurrentUser() user: SafeUser) {
    return this.paymentsService.createCheckoutSession(user)
  }

  // GET /api/v1/payments/me
  // Authenticated — returns the current user's payment status.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getStatus(@CurrentUser() user: SafeUser) {
    return this.paymentsService.getStatus(user.id)
  }

  // POST /api/v1/payments/webhook
  // NO auth guard — Stripe calls this. Security is the webhook signature.
  // Uses req.rawBody (enabled by rawBody: true in NestFactory.create) so the
  // original bytes are available for Stripe's HMAC signature check.
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature)
  }
}
