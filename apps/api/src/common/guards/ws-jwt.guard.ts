import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from '@ai-support/types';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    // If user was already authenticated during connection handshake
    if (client.data?.user) {
      return true;
    }

    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`WebSocket unauthorized: missing token for socket ${client.id}`);
      throw new WsException('Authentication token missing from WebSocket handshake');
    }

    try {
      const user = await this.validateToken(token);
      client.data.user = user;
      return true;
    } catch (err: any) {
      this.logger.warn(`WebSocket unauthorized for socket ${client.id}: ${err.message}`);
      throw new WsException(err.message || 'Unauthorized WebSocket access');
    }
  }

  extractToken(client: Socket): string | null {
    const auth = client.handshake.auth || {};
    const headers = client.handshake.headers || {};
    const query = (client.handshake.query || {}) as Record<string, any>;

    let rawToken: string | undefined =
      auth.token ||
      auth.Authorization ||
      headers.authorization ||
      headers['x-access-token'] ||
      query.token;

    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    if (rawToken.startsWith('Bearer ')) {
      return rawToken.slice(7).trim();
    }

    return rawToken.trim();
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const secret =
      this.configService.get<string>('JWT_SECRET')?.trim() ||
      process.env.JWT_SECRET?.trim();

    if (!secret) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty.',
      );
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      throw new WsException('Invalid or expired authentication token');
    }

    if (!payload?.sub) {
      throw new WsException('Invalid token payload: missing subject identifier');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new WsException('User not found or account deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as any,
      organizationId: user.organizationId || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };
  }
}
