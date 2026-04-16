import { Prisma } from '@prisma/client';

/**
 * Retries a transaction callback up to `maxRetries` times when a unique
 * constraint violation (P2002) occurs. This handles the race condition in
 * sequential number generation (quotationNumber, invoiceNumber, dnNumber, poNumber).
 */
export async function withUniqueRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (
        attempt < maxRetries &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Brief back-off before retry
        await new Promise((resolve) => setTimeout(resolve, attempt * 10));
        continue;
      }
      throw error;
    }
  }
}
