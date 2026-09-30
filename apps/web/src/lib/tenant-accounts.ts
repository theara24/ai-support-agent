import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

const pbkdf2Async = promisify(pbkdf2);

export interface TenantAccount {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER';
  organizationId: string;
  organizationName: string;
  createdAt: string;
}

// OWASP-recommended work factor for PBKDF2-HMAC-SHA512.
const PBKDF2_DIGEST = 'sha512';
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN = 64;
const SALT_BYTES = 16;

// Iteration count used by hashes written before 2026-09-30. Kept only so existing
// accounts keep verifying; new hashes always use PBKDF2_ITERATIONS above.
const LEGACY_ITERATIONS = 1_000;

function deriveKey(
  password: string,
  salt: string,
  iterations: number
): Promise<string> {
  return pbkdf2Async(
    password.normalize('NFKC'),
    salt,
    iterations,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  ).then((key) => (key as Buffer).toString('hex'));
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Hashes a password into a self-describing, versioned format so the work factor
 * can be raised later without invalidating existing credentials:
 *   pbkdf2$<digest>$<iterations>$<saltHex>$<keyHex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${key}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) return false;

  const parts = storedHash.split('$');
  if (parts.length === 5 && parts[0] === 'pbkdf2') {
    const iterations = Number(parts[2]);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;
    const actual = await deriveKey(password, parts[3], iterations);
    return safeEqualHex(actual, parts[4]);
  }

  // Legacy `saltHex:keyHex` hashes produced before the versioned format.
  if (storedHash.includes(':')) {
    const [salt, expected] = storedHash.split(':');
    const actual = await deriveKey(password, salt, LEGACY_ITERATIONS);
    return safeEqualHex(actual, expected);
  }

  return false;
}

function slugifyOrgName(orgName: string): string {
  return (
    orgName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace'
  );
}

function splitName(contactName: string): { firstName: string; lastName: string } {
  const names = (contactName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: names[0] || 'Admin',
    lastName: names.slice(1).join(' ') || 'User',
  };
}

function toTenantAccount(user: {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  organizationId: string | null;
  createdAt: Date;
  organization?: { id: string; name: string } | null;
}): TenantAccount {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    firstName: user.firstName || 'Admin',
    lastName: user.lastName || 'User',
    role: user.role as TenantAccount['role'],
    organizationId: user.organizationId || user.organization?.id || '',
    organizationName: user.organization?.name || '',
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Automatically provisions an Organization and an ADMIN User for an approved
 * onboarding request. Persisted in Postgres so the account survives serverless
 * cold starts and horizontal scaling.
 */
export async function provisionTenantAdmin(params: {
  email: string;
  password: string;
  orgName: string;
  contactName: string;
}): Promise<TenantAccount> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured on this deployment');
  }

  const { email, password, orgName, contactName } = params;
  const cleanEmail = email.trim().toLowerCase();
  const cleanOrgName = orgName.trim();
  const slug = slugifyOrgName(cleanOrgName);
  const { firstName, lastName } = splitName(contactName);
  const passwordHash = await hashPassword(password);

  const prisma = getPrisma();

  const organization = await prisma.organization.upsert({
    where: { slug },
    update: { name: cleanOrgName },
    create: { name: cleanOrgName, slug },
  });

  const user = await prisma.user.upsert({
    where: { email: cleanEmail },
    update: {
      passwordHash,
      firstName,
      lastName,
      role: 'ADMIN' as any,
      organizationId: organization.id,
    },
    create: {
      email: cleanEmail,
      passwordHash,
      firstName,
      lastName,
      role: 'ADMIN' as any,
      organizationId: organization.id,
    },
  });

  const userWithOrg = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: { organization: true },
  });

  return toTenantAccount(userWithOrg!);
}

async function findPersistedAccount(
  email: string,
  password: string
): Promise<TenantAccount | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const user = await getPrisma().user.findUnique({
      where: { email },
      include: { organization: true },
    });
    if (!user) return null;

    const isMatch = await verifyPassword(password, user.passwordHash);
    return isMatch ? toTenantAccount(user) : null;
  } catch (err) {
    console.error('Database authentication lookup failed:', err);
    return null;
  }
}

/**
 * Authenticates a user against persisted Postgres accounts, falling back to the
 * hardcoded bootstrap accounts below (demo / owner sign-ins).
 */
export async function authenticateCredentials(
  email: string,
  pass: string
): Promise<TenantAccount | null> {
  const cleanEmail = email.trim().toLowerCase();

  const persisted = await findPersistedAccount(cleanEmail, pass);
  if (persisted) return persisted;

  const now = new Date().toISOString();

  if (cleanEmail === 'chimtheara93@gmail.com') {
    if (pass === 'Support@6137!' || pass === 'SecureP@ss123') {
      return {
        id: 'theara-portfolio-admin',
        email: cleanEmail,
        passwordHash: '',
        firstName: 'Theara',
        lastName: 'Chim',
        role: 'ADMIN',
        organizationId: 'portfolio-org-id',
        organizationName: 'Portfolio',
        createdAt: now,
      };
    }
  }

  if (cleanEmail === 'admin@acme-support.local' && pass === 'AdminPass123!') {
    return {
      id: 'super-admin-root',
      email: cleanEmail,
      passwordHash: '',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      organizationId: 'acme-org-id',
      organizationName: 'Acme Support Platform',
      createdAt: now,
    };
  }

  if (cleanEmail === 'admin@company.com' && pass === 'SecureP@ss123') {
    return {
      id: 'tenant-admin-demo',
      email: cleanEmail,
      passwordHash: '',
      firstName: 'Tenant',
      lastName: 'Admin',
      role: 'ADMIN',
      organizationId: 'demo-org-id',
      organizationName: 'Company Support',
      createdAt: now,
    };
  }

  if (cleanEmail === 'agent@company.com' && pass === 'SecureP@ss123') {
    return {
      id: 'agent-demo',
      email: cleanEmail,
      passwordHash: '',
      firstName: 'Support',
      lastName: 'Agent',
      role: 'SUPPORT_AGENT',
      organizationId: 'demo-org-id',
      organizationName: 'Company Support',
      createdAt: now,
    };
  }

  return null;
}
