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

// Built-in standard crypto hashing (zero external C++ dependencies, 100% portable on Vercel)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return key === hash;
  }
  return false;
}

// Global in-memory cache across serverless invocations within the same container
declare global {
  var __TENANT_ACCOUNTS_CACHE__: Map<string, TenantAccount> | undefined;
}

if (!global.__TENANT_ACCOUNTS_CACHE__) {
  global.__TENANT_ACCOUNTS_CACHE__ = new Map<string, TenantAccount>();
}

const accountsCache = global.__TENANT_ACCOUNTS_CACHE__;

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

  const passwordHash = hashPassword(password);
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

  // Save to in-memory runtime cache
  accountsCache.set(cleanEmail, account);

  return account;
}

/**
 * Authenticates a user against Provisioned Tenants + Seed Accounts + Theara Admin.
 */
export async function authenticateCredentials(
  email: string,
  pass: string
): Promise<TenantAccount | null> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // 1. Check Theara Chim workspace admin
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

  // 2. Check Provisioned Tenant Accounts Store
  const provisioned = accountsCache.get(cleanEmail);
  if (provisioned) {
    const isMatch = verifyPassword(cleanPass, provisioned.passwordHash);
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

  return null;
}
