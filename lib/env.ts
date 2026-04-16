/**
 * Environment variable validation.
 * This module validates required env vars at module load time so that
 * missing configuration is caught immediately at startup, not at runtime.
 *
 * Import this in app/layout.tsx (server component) or instrumentation.ts
 * to ensure validation runs before the app serves any requests.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in the required values.'
    );
  }

  // Warn about weak JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    console.warn(
      '[SECURITY] JWT_SECRET is shorter than 32 characters. ' +
      'Use a long random string in production.'
    );
  }
}

// Run validation only at runtime, not during build
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  validateEnv();
}
