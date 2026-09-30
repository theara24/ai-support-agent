import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtPayload, UserRole } from '@ai-support/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: (dto.role || UserRole.CUSTOMER) as any,
        organizationId: dto.organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role as unknown as UserRole,
      user.organizationId || undefined,
    );

    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role as unknown as UserRole,
      user.organizationId || undefined,
    );

    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
    };

    return { user: userResponse, ...tokens };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    // Decode user payload from refresh token
    let decoded: any;
    try {
      decoded = this.jwtService.verify(dto.refreshToken, {
        secret: this.getJwtRefreshSecret(),
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = decoded.sub;

    // Retrieve active non-expired refresh tokens for user
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    let matchedTokenRecord: any = null;

    for (const record of tokens) {
      const isMatch = await bcrypt.compare(dto.refreshToken, record.token);
      if (isMatch) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }

    // Revoke old token (Token Rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchedTokenRecord.id },
      data: { isRevoked: true },
    });

    const { user } = matchedTokenRecord;
    return this.generateTokens(
      user.id,
      user.email,
      user.role as unknown as UserRole,
      user.organizationId || undefined,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    orgId?: string,
  ) {
    const payload: JwtPayload = { sub: userId, email, role, orgId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshTokenStr = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.getJwtRefreshSecret(),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      },
    );

    // Hash refresh token before DB storage
    const hashedRefreshToken = await bcrypt.hash(refreshTokenStr, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenStr,
    };
  }

  private getJwtSecret(): string {
    const secret =
      this.configService.get<string>('JWT_SECRET')?.trim() ||
      process.env.JWT_SECRET?.trim();
    if (!secret) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. Application refuses to boot.',
      );
    }
    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret =
      this.configService.get<string>('JWT_REFRESH_SECRET')?.trim() ||
      process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL CONFIGURATION ERROR: JWT_REFRESH_SECRET environment variable is missing or empty in production.',
        );
      }
      return this.getJwtSecret();
    }
    return secret;
  }
}
