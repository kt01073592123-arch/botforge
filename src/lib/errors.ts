// Production error logging — Sentry yoqilgan bo'lsa unga yuboradi,
// yo'q bo'lsa console.error'ga qaytadi.
//
// Vercel'ga env qo'shing: SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN
// Sentry SDK (`@sentry/nextjs`) o'rnatilsa va init bo'lsa avtomatik ishlatadi.

type SentryHub = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureException: (e: unknown, ctx?: any) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureMessage: (msg: string, ctx?: any) => string;
};

function getSentry(): SentryHub | null {
  if (typeof globalThis === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sentry = (globalThis as any).Sentry;
  if (sentry && typeof sentry.captureException === "function") {
    return sentry as SentryHub;
  }
  return null;
}

export function logError(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const sentry = getSentry();
  const msg = err instanceof Error ? err.message : String(err);
  if (sentry) {
    sentry.captureException(err, { tags: { context }, extra });
  } else {
    console.error(`[${context}]`, msg, extra ?? "");
  }
}

export function logMessage(
  context: string,
  message: string,
  level: "info" | "warning" | "error" = "info",
): void {
  const sentry = getSentry();
  if (sentry) {
    sentry.captureMessage(`[${context}] ${message}`, { level });
  } else {
    console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](
      `[${context}]`,
      message,
    );
  }
}
