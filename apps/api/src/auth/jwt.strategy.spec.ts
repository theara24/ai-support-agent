import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@ai-support/types';

describe('JwtStrategy', () => {
  let configService: jest.Mocked<ConfigService>;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    delete process.env.JWT_SECRET;
    configService = {
      get: jest.fn(),
    } as any;

    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
  });

  it('should throw an error on startup if JWT_SECRET is missing or empty', () => {
    configService.get.mockReturnValue('');

    expect(() => {
      new JwtStrategy(configService, prisma as unknown as PrismaService);
    }).toThrow('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty.');
  });

  it('should initialize successfully when JWT_SECRET is configured', () => {
    configService.get.mockReturnValue('valid-secret-key-for-test');

    const strategy = new JwtStrategy(configService, prisma as unknown as PrismaService);
    expect(strategy).toBeDefined();
  });

  it('should validate and return active user from payload', async () => {
    configService.get.mockReturnValue('valid-secret-key-for-test');
    const strategy = new JwtStrategy(configService, prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.SUPPORT_AGENT,
      organizationId: 'org-1',
      firstName: 'Alice',
      lastName: 'Smith',
    });

    const result = await strategy.validate({ sub: 'user-1', email: 'test@example.com', role: UserRole.SUPPORT_AGENT });
    expect(result.id).toBe('user-1');
    expect(result.role).toBe(UserRole.SUPPORT_AGENT);
  });

  it('should throw UnauthorizedException if user no longer exists', async () => {
    configService.get.mockReturnValue('valid-secret-key-for-test');
    const strategy = new JwtStrategy(configService, prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'ghost-user', email: 'ghost@example.com', role: UserRole.SUPPORT_AGENT })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
