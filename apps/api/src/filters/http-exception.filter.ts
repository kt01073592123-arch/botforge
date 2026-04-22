import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

/**
 * Global exception filter — normalises all error responses.
 *
 * Guarantees:
 *  - All responses carry a `message` string key (frontend reads body.message).
 *  - For validation errors that include field-level `errors`, the message is
 *    serialised as JSON so the frontend config-form can parse field errors:
 *      body.message = '{"message":"...","errors":{"field":["..."]}}'
 *  - Unexpected 5xx errors: internal details are logged server-side only;
 *    the client receives a generic "Internal server error" message.
 *  - No stack traces ever reach the client.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    // ── Known HTTP exceptions (400, 401, 402, 403, 404, 409, 429, …) ──────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const raw = exception.getResponse()

      let message: string

      if (typeof raw === 'string') {
        message = raw
      } else if (typeof raw === 'object' && raw !== null) {
        const body = raw as Record<string, unknown>
        if (body.errors && typeof body.errors === 'object') {
          // Validation errors with field map — serialise so frontend can parse
          // field-level messages with JSON.parse(err.message)
          const msgStr = Array.isArray(body.message)
            ? body.message.join('; ')
            : (body.message as string) ?? 'Validation failed'
          message = JSON.stringify({ message: msgStr, errors: body.errors })
        } else {
          // ValidationPipe produces body.message as a string[] — join to single string
          const rawMsg = body.message
          message = Array.isArray(rawMsg)
            ? (rawMsg as string[]).join('; ')
            : (rawMsg as string) ?? exception.message
        }
      } else {
        message = exception.message
      }

      res.status(status).json({ message })
      return
    }

    // ── Unexpected errors (programmer mistakes, DB outages, etc.) ───────────
    const errMsg = exception instanceof Error ? exception.message : String(exception)
    const stack  = exception instanceof Error ? exception.stack  : undefined

    this.logger.error(
      `Unhandled exception [${req.method} ${req.url}]: ${errMsg}`,
      stack,
    )

    // Never expose internal details to clients
    res.status(500).json({ message: 'Internal server error' })
  }
}
