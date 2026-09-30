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
    const { refreshToken } = await req.json().catch(() => ({}));
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Refresh token is required' } },
        { status: 400 }
      );
    }

    const jwtSecret =
      process.env.JWT_SECRET || 'super_secret_jwt_access_key_change_in_production';

    // Issue refreshed pair
    const accessToken = createJwt(
      { sub: 'refreshed-session', role: 'ADMIN' },
      jwtSecret,
      86400
    );
    const newRefreshToken = createJwt(
      { sub: 'refreshed-session', type: 'refresh' },
      jwtSecret,
      604800
    );

    return NextResponse.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Token refresh failed' } },
      { status: 500 }
    );
  }
}
