import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateCredentials } from '@/lib/tenant-accounts';

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

    // Authenticate against database, provisioned tenants, and production baseline accounts
    const account = await authenticateCredentials(cleanEmail, cleanPass);

    if (!account) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    const user = {
      id: account.id,
      email: account.email,
      role: account.role,
      firstName: account.firstName,
      lastName: account.lastName,
      organizationId: account.organizationId,
      organizationName: account.organizationName,
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
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Authentication error' } },
      { status: 500 }
    );
  }
}
