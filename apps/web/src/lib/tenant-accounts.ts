import bcrypt from 'bcrypt';
import crypto from 'crypto';

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

// Global in-memory cache across serverless invocations within the same container
declare global {
  var __TENANT_ACCOUNTS_CACHE__: Map<string, TenantAccount> | undefined;
}

if (!global.__TENANT_ACCOUNTS_CACHE__) {
  global.__TENANT_ACCOUNTS_CACHE__ = new Map<string, TenantAccount>();
}

const accountsCache = global.__TENANT_ACCOUNTS_CACHE__;

// Helper to initialize or get Prisma client safely
async function getPrisma() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    return new PrismaClient();
  } catch (e) {
    return null;
  }
}

/**
 * Automatically provisions an Organization and an Admin User for approved requests.
 */
export async function provisionTenantAdmin(params: {
  email: string;
  password: string;
  orgName: string;
  contactName: string;
}): Promise<TenantAccount> {
  const { email, password, orgName, contactName } = params;
  const cleanEmail = email.trim().toLowerCase();
  const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';

  const names = (contactName || '').trim().split(' ');
  const firstName = names[0] || 'Admin';
  const lastName = names.slice(1).join(' ') || 'User';

  const passwordHash = await bcrypt.hash(password, 10);
  const orgId = `org-${slug}-${Date.now().toString(36)}`;
  const userId = `user-${Date.now().toString(36)}`;

  const account: TenantAccount = {
    id: userId,
    email: cleanEmail,
    passwordHash,
    firstName,
    lastName,
    role: 'ADMIN',
    organizationId: orgId,
    organizationName: orgName.trim(),
    createdAt: new Date().toISOString(),
  };

  // 1. Save to in-memory runtime cache
  accountsCache.set(cleanEmail, account);

  // 2. If PostgreSQL database is connected, persist directly via Prisma
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const org = await prisma.organization.upsert({
        where: { slug },
        update: { name: orgName },
        create: { name: orgName, slug },
      });

      const user = await prisma.user.upsert({
        where: { email: cleanEmail },
        update: {
          passwordHash,
          firstName,
          lastName,
          role: 'ADMIN' as any,
          organizationId: org.id,
        },
        create: {
          email: cleanEmail,
          passwordHash,
          firstName,
          lastName,
          role: 'ADMIN' as any,
          organizationId: org.id,
        },
      });

      account.id = user.id;
      account.organizationId = org.id;
      accountsCache.set(cleanEmail, account);
    } catch (dbErr) {
      console.warn('Prisma database sync skipped or failed (using memory store):', dbErr);
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }

  return account;
}

/**
 * Authenticates a user against Database + Provisioned Tenants + Seed Accounts.
 */
export async function authenticateCredentials(
  email: string,
  pass: string
): Promise<TenantAccount | null> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // 1. Check PostgreSQL database first if connected
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { organization: true },
      });

      if (dbUser && dbUser.passwordHash) {
        const isValid = await bcrypt.compare(cleanPass, dbUser.passwordHash);
        if (isValid) {
          await prisma.$disconnect().catch(() => {});
          return {
            id: dbUser.id,
            email: dbUser.email,
            passwordHash: dbUser.passwordHash,
            firstName: dbUser.firstName || '',
            lastName: dbUser.lastName || '',
            role: dbUser.role as any,
            organizationId: dbUser.organizationId || '',
            organizationName: dbUser.organization?.name || 'Default Organization',
            createdAt: dbUser.createdAt.toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('Prisma auth lookup error, checking fallback store:', err);
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }

  // 2. Check Provisioned Tenant Accounts Store
  const provisioned = accountsCache.get(cleanEmail);
  if (provisioned) {
    const isMatch = await bcrypt.compare(cleanPass, provisioned.passwordHash);
    if (isMatch) return provisioned;
  }

  // 3. Check Super Admin production baseline account
  if (cleanEmail === 'admin@acme-support.local' && cleanPass === 'AdminPass123!') {
    return {
      id: 'super-admin-root',
      email: 'admin@acme-support.local',
      passwordHash: '',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      organizationId: 'acme-org-id',
      organizationName: 'Acme Support Platform',
      createdAt: new Date().toISOString(),
    };
  }

  // 4. Check Demo baseline accounts
  if (cleanEmail === 'admin@company.com' && cleanPass === 'SecureP@ss123') {
    return {
      id: 'tenant-admin-demo',
      email: 'admin@company.com',
      passwordHash: '',
      firstName: 'Tenant',
      lastName: 'Admin',
      role: 'ADMIN',
      organizationId: 'demo-org-id',
      organizationName: 'Company Support',
      createdAt: new Date().toISOString(),
    };
  }

  if (cleanEmail === 'agent@company.com' && cleanPass === 'SecureP@ss123') {
    return {
      id: 'agent-demo',
      email: 'agent@company.com',
      passwordHash: '',
      firstName: 'Support',
      lastName: 'Agent',
      role: 'SUPPORT_AGENT',
      organizationId: 'demo-org-id',
      organizationName: 'Company Support',
      createdAt: new Date().toISOString(),
    };
  }

  // 5. Check if user is Theara Chim admin
  if (cleanEmail === 'chimtheara93@gmail.com') {
    if (cleanPass === 'Support@6137!' || cleanPass === 'SecureP@ss123') {
      return {
        id: 'theara-portfolio-admin',
        email: 'chimtheara93@gmail.com',
        passwordHash: '',
        firstName: 'Theara',
        lastName: 'Chim',
        role: 'ADMIN',
        organizationId: 'portfolio-org-id',
        organizationName: 'Portfolio',
        createdAt: new Date().toISOString(),
      };
    }
  }

  return null;
}
