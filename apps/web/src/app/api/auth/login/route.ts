import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function createJwt(payload: any, secret: string, expiresInSec: number = 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const fullPayload = { ...payload, exp };

  const encode = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const headerB64 = encode(header);
  const payloadB64 = encode(fullPayload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    const jwtSecret =
      process.env.JWT_SECRET || 'super_secret_jwt_access_key_change_in_production';

    // 1. Check Portfolio Admin account (Theara Chim)
    if (cleanEmail === 'chimtheara93@gmail.com') {
      // Accepts Support@6137! or any Support@ password
      if (cleanPass === 'Support@6137!' || cleanPass.startsWith('Support@') || cleanPass === 'SecureP@ss123') {
        const user = {
          id: 'portfolio-admin-theara',
          email: 'chimtheara93@gmail.com',
          role: 'ADMIN',
          firstName: 'Theara',
          lastName: 'Chim',
          organizationId: 'portfolio-org-id',
          organizationName: 'Portfolio',
        };

        const accessToken = createJwt(
          { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
          jwtSecret,
          86400
        );
        const refreshToken = createJwt({ sub: user.id, type: 'refresh' }, jwtSecret, 604800);

        return NextResponse.json({
          success: true,
          data: { accessToken, refreshToken, user },
        });
      }
    }

    // 2. Check Standard Super Admin
    if (cleanEmail === 'admin@acme-support.local' && cleanPass === 'AdminPass123!') {
      const user = {
        id: 'super-admin-id',
        email: 'admin@acme-support.local',
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        organizationId: 'acme-org-id',
        organizationName: 'Acme Support Inc.',
      };

      const accessToken = createJwt(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        jwtSecret,
        86400
      );
      const refreshToken = createJwt({ sub: user.id, type: 'refresh' }, jwtSecret, 604800);

      return NextResponse.json({
        success: true,
        data: { accessToken, refreshToken, user },
      });
    }

    // 3. Check Tenant Admin
    if (cleanEmail === 'admin@company.com' && cleanPass === 'SecureP@ss123') {
      const user = {
        id: 'tenant-admin-id',
        email: 'admin@company.com',
        role: 'ADMIN',
        firstName: 'Tenant',
        lastName: 'Admin',
        organizationId: 'acme-org-id',
        organizationName: 'Acme Support Inc.',
      };

      const accessToken = createJwt(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        jwtSecret,
        86400
      );
      const refreshToken = createJwt({ sub: user.id, type: 'refresh' }, jwtSecret, 604800);

      return NextResponse.json({
        success: true,
        data: { accessToken, refreshToken, user },
      });
    }

    // 4. Check Support Agent
    if (cleanEmail === 'agent@company.com' && cleanPass === 'SecureP@ss123') {
      const user = {
        id: 'support-agent-id',
        email: 'agent@company.com',
        role: 'SUPPORT_AGENT',
        firstName: 'Support',
        lastName: 'Agent',
        organizationId: 'acme-org-id',
        organizationName: 'Acme Support Inc.',
      };

      const accessToken = createJwt(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        jwtSecret,
        86400
      );
      const refreshToken = createJwt({ sub: user.id, type: 'refresh' }, jwtSecret, 604800);

      return NextResponse.json({
        success: true,
        data: { accessToken, refreshToken, user },
      });
    }

    // 5. Check Demo Specialist
    if (cleanEmail === 'demo@acme-support.local' && cleanPass === 'DemoPass123!') {
      const user = {
        id: 'demo-specialist-id',
        email: 'demo@acme-support.local',
        role: 'SUPPORT_AGENT',
        firstName: 'Demo',
        lastName: 'Specialist',
        organizationId: 'acme-org-id',
        organizationName: 'Acme Support Inc.',
      };

      const accessToken = createJwt(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        jwtSecret,
        86400
      );
      const refreshToken = createJwt({ sub: user.id, type: 'refresh' }, jwtSecret, 604800);

      return NextResponse.json({
        success: true,
        data: { accessToken, refreshToken, user },
      });
    }

    // 6. Generic Approved Temporary Password Support (for any newly approved tenant)
    if (cleanPass.startsWith('Support@') && cleanEmail.includes('@')) {
      const prefix = cleanEmail.split('@')[0];
      const user = {
        id: `tenant-${Date.now()}`,
        email: cleanEmail,
        role: 'ADMIN',
        firstName: prefix.charAt(0).toUpperCase() + prefix.slice(1),
        lastName: 'Admin',
        organizationId: `org-${prefix}`,
        organizationName: 'Custom Workspace',
      };

      const accessToken = createJwt(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        jwtSecret,
        86400
      );
      const refreshToken = createJwt({ sub: user.id, type: 'refresh' }, jwtSecret, 604800);

      return NextResponse.json({
        success: true,
        data: { accessToken, refreshToken, user },
      });
    }

    return NextResponse.json(
      { success: false, error: { message: 'Invalid email or password' } },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Authentication error' } },
      { status: 500 }
    );
  }
}
