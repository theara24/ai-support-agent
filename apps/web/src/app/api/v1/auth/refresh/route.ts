import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  type RefreshTokenPayload,
} from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json().catch(() => ({}) as { refreshToken?: string });

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Refresh token is required' } },
        { status: 400 }
      );
    }

    // The token must be authentic, unexpired and of refresh type. The previous
    // implementation skipped this check and minted an ADMIN token for whatever
    // `sub` the caller supplied.
    const payload = verifyToken<RefreshTokenPayload>(refreshToken);

    if (!payload || payload.type !== 'refresh' || !payload.sub) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid or expired refresh token' } },
        { status: 401 }
      );
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication is not configured' } },
        { status: 503 }
      );
    }

    // Re-read the user so role and org come from the database, never from the token.
    const user = await getPrisma().user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Account no longer exists' } },
        { status: 401 }
      );
    }

    const accessToken = createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || '',
    });

    return NextResponse.json({
      success: true,
      data: { accessToken, refreshToken: createRefreshToken(user.id) },
    });
  } catch (err: any) {
    console.error('Refresh route error:', err);
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Token refresh failed' } },
      { status: 500 }
    );
  }
}
