/**
 * Structured logging helpers.
 *
 * Every call emits a single JSON line via NestJS Logger so the output is
 * machine-parseable (Loki, Datadog, Grafana, grep) while still readable in
 * a terminal.
 *
 * Format: {"event":"auth.login.ok","userId":"clxyz..."}
 *
 * Rules:
 *  - never log passwords, tokens, keys, or secretData values
 *  - keep values short — IDs and status codes only, not full objects
 */

import { Logger } from '@nestjs/common'

export type LogCtx = Record<string, string | number | boolean | null | undefined>

export function logEvent(logger: Logger, event: string, ctx: LogCtx = {}): void {
  logger.log(JSON.stringify({ event, ...ctx }))
}

export function logWarn(logger: Logger, event: string, ctx: LogCtx = {}): void {
  logger.warn(JSON.stringify({ event, ...ctx }))
}

export function logError(
  logger: Logger,
  event: string,
  ctx: LogCtx = {},
  err?: unknown,
): void {
  const error = err instanceof Error ? err.message : err != null ? String(err) : undefined
  logger.error(JSON.stringify({ event, ...ctx, ...(error !== undefined ? { error } : {}) }))
}
