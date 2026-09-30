import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __WEB_PRISMA__: PrismaClient | undefined;
}

/**
 * Lazily-constructed Prisma client.
 *
 * Constructed on first use rather than at module load so that `next build` never
 * opens a database connection while prerendering, and so a missing DATABASE_URL
 * surfaces as a request-time error instead of a build failure.
 */
export function getPrisma(): PrismaClient {
  if (!global.__WEB_PRISMA__) {
    global.__WEB_PRISMA__ = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return global.__WEB_PRISMA__;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
