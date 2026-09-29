import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, Permission } from '@ai-support/types';

describe('Security Guards', () => {
  describe('OptionalJwtAuthGuard', () => {
    let guard: OptionalJwtAuthGuard;

    beforeEach(() => {
      guard = new OptionalJwtAuthGuard();
    });

    it('should return null when error occurs or user is not provided', () => {
      expect(guard.handleRequest(new Error('no token'), null)).toBeNull();
      expect(guard.handleRequest(null, null)).toBeNull();
    });

    it('should return the user object when authenticated', () => {
      const mockUser = { id: 'u1', role: UserRole.SUPPORT_AGENT };
      expect(guard.handleRequest(null, mockUser)).toEqual(mockUser);
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new RolesGuard(reflector);
    });

    it('should allow access if no roles are required on route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.CUSTOMER } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should deny access if user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.CUSTOMER } }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow access if user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.SUPPORT_AGENT]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.SUPPORT_AGENT } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new PermissionsGuard(reflector);
    });

    it('should allow access if no permissions are required on route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.CUSTOMER } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw ForbiddenException if user session is missing or unauthenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ANALYTICS_READ]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow SUPPORT_AGENT with analytics:read permission to access analytics route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ANALYTICS_READ]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.SUPPORT_AGENT } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow ADMIN with analytics:read permission to access analytics route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ANALYTICS_READ]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.ADMIN } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should deny CUSTOMER from accessing route requiring analytics:read permission', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ANALYTICS_READ]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.CUSTOMER } }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Missing required permissions: analytics:read');
    });

    it('should deny role lacking required permission', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.USER_MANAGE]);
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.SUPPORT_AGENT } }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Missing required permissions: user:manage');
    });
  });
});
