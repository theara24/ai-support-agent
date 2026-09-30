import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@ai-support/types';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as any;

    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    guard = new WsJwtGuard(jwtService, configService, prisma as unknown as PrismaService);
  });

  describe('extractToken', () => {
    it('should extract token from handshake.auth.token', () => {
      const socket = {
        handshake: {
          auth: { token: 'auth-token-123' },
          headers: {},
        },
      } as any;
      expect(guard.extractToken(socket)).toBe('auth-token-123');
    });

    it('should extract token from handshake.auth.Authorization stripping Bearer', () => {
      const socket = {
        handshake: {
          auth: { Authorization: 'Bearer auth-bearer-token' },
          headers: {},
        },
      } as any;
      expect(guard.extractToken(socket)).toBe('auth-bearer-token');
    });

    it('should extract token from headers.authorization stripping Bearer', () => {
      const socket = {
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
      } as any;
      expect(guard.extractToken(socket)).toBe('header-token');
    });

    it('should extract token from handshake.query.token', () => {
      const socket = {
        handshake: {
          auth: {},
          headers: {},
          query: { token: 'query-token' },
        },
      } as any;
      expect(guard.extractToken(socket)).toBe('query-token');
    });

    it('should return null when no token is present', () => {
      const socket = {
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
      } as any;
      expect(guard.extractToken(socket)).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should successfully validate token and return authenticated user', () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'agent@acme.com',
        role: UserRole.SUPPORT_AGENT,
        organizationId: 'org-1',
      } as any);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'agent@acme.com',
        role: UserRole.SUPPORT_AGENT,
        organizationId: 'org-1',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      return expect(guard.validateToken('valid-token')).resolves.toEqual({
        id: 'user-1',
        email: 'agent@acme.com',
        role: UserRole.SUPPORT_AGENT,
        organizationId: 'org-1',
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });

    it('should throw WsException when jwt verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(guard.validateToken('expired-token')).rejects.toThrow(WsException);
      await expect(guard.validateToken('expired-token')).rejects.toThrow(
        'Invalid or expired authentication token',
      );
    });

    it('should throw WsException when sub is missing in payload', async () => {
      jwtService.verifyAsync.mockResolvedValue({ email: 'test@example.com' } as any);
      await expect(guard.validateToken('missing-sub-token')).rejects.toThrow(
        'Invalid token payload: missing subject identifier',
      );
    });

    it('should throw WsException when user does not exist in database', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-not-found' } as any);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(guard.validateToken('ghost-token')).rejects.toThrow(
        'User not found or account deactivated',
      );
    });
  });

  describe('canActivate', () => {
    it('should return true if client.data.user is already set', async () => {
      const mockSocket = {
        data: {
          user: { id: 'u1', role: UserRole.SUPPORT_AGENT },
        },
      };
      const context = {
        switchToWs: () => ({
          getClient: () => mockSocket,
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should extract, validate token and populate client.data.user', async () => {
      const mockSocket: any = {
        data: {},
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
      };
      const context = {
        switchToWs: () => ({
          getClient: () => mockSocket,
        }),
      } as unknown as ExecutionContext;

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' } as any);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.SUPPORT_AGENT,
        organizationId: 'org-1',
        firstName: 'Support',
        lastName: 'Agent',
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockSocket.data.user).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.SUPPORT_AGENT,
        organizationId: 'org-1',
        firstName: 'Support',
        lastName: 'Agent',
      });
    });

    it('should throw WsException when token is missing', async () => {
      const mockSocket = {
        id: 'sock-1',
        data: {},
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
      };
      const context = {
        switchToWs: () => ({
          getClient: () => mockSocket,
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication token missing from WebSocket handshake',
      );
    });
  });
});
