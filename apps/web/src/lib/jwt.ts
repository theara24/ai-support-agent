import crypto from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  exp: number;
}

const ACCESS_TTL_SECONDS = 86_400;
const REFRESH_TTL_SECONDS = 604_800;

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'super_secret_jwt_access_key_change_in_production';
}

export function createAccessToken(
  payload: Omit<AccessTokenPayload, 'exp'>,
  secret = getJwtSecret()
): string {
  const full = { ...payload, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS };
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(full)}`;
  return `${data}.${sign(data, secret)}`;
}

export function createRefreshToken(sub: string, secret = getJwtSecret()): string {
  const full = {
    sub,
    type: 'refresh' as const,
    exp: Math.floor(Date.now() / 1000) + REFRESH_TTL_SECONDS,
  };
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(full)}`;
  return `${data}.${sign(data, secret)}`;
}

/**
 * Verifies signature and expiry. Returns null for anything malformed, wrongly
 * signed, or expired, so callers can never be tricked into trusting a forged
 * token.
 */
export function verifyToken<T>(token: string, secret = getJwtSecret()): T | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;

  const expected = sign(`${headerB64}.${payloadB64}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload?.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return payload as T;
}
