/**
 * Centralized error logging utility.
 *
 * Currently logs to console. To add Sentry:
 *   1. Run: npm install @sentry/nextjs
 *   2. Replace the console.error calls below with Sentry.captureException(error, { extra: context })
 *   3. Initialize Sentry in sentry.client.config.ts / sentry.server.config.ts
 */

type LogContext = Record<string, unknown>;

export function logError(message: string, error: unknown, context?: LogContext) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (process.env.NODE_ENV === 'production') {
    // In production, log a structured JSON line for log aggregators (Vercel, Datadog, etc.)
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join(' | '),
      ...context,
      timestamp: new Date().toISOString(),
    }));
  } else {
    // In development, keep readable output
    console.error(`[ERROR] ${message}`, err, context ?? '');
  }

  // ─── Plug in Sentry here when ready ────────────────────────────────────
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.captureException(err, { extra: { message, ...context } });
  // ───────────────────────────────────────────────────────────────────────
}

export function logWarn(message: string, context?: LogContext) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
  } else {
    console.warn(`[WARN] ${message}`, context ?? '');
  }
}
