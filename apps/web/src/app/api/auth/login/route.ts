import { NextRequest, NextResponse } from 'next/server';
import { authenticateCredentials } from '@/lib/tenant-accounts';
import { createAccessToken, createRefreshToken } from '@/lib/jwt';

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

    // Authenticate against the persisted Postgres accounts
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

    // `sub` is the real users.id so the API's JwtStrategy can resolve it.
    const accessToken = createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
    const refreshToken = createRefreshToken(user.id);

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
