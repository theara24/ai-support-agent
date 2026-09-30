import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UserRole, Permission } from '@ai-support/types';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CreateUserDto, UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'List all organization users' })
  async findAll(@GetUser('organizationId') orgId?: string, @GetUser('role') role?: UserRole) {
    const effectiveOrgId = role === UserRole.SUPER_ADMIN ? undefined : orgId;
    return this.usersService.findAll(effectiveOrgId);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Get live user and platform statistics' })
  async getStats(
    @GetUser('organizationId') orgId?: string,
    @GetUser('role') role?: UserRole,
  ) {
    return this.usersService.getStats(orgId, role);
  }

  @Get('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT_AGENT, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  async getProfile(@GetUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT_AGENT, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Update current logged-in user profile' })
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('change-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT_AGENT, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Change current logged-in user password' })
  async changePassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Create a new support agent or admin' })
  async createAgent(
    @Body() dto: CreateUserDto,
    @GetUser('organizationId') orgId?: string,
    @GetUser('role') role?: UserRole,
  ) {
    return this.usersService.createAgent(dto, orgId, role);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Delete a support agent or user' })
  async deleteAgent(
    @Param('id') id: string,
    @GetUser('id') callerUserId: string,
    @GetUser('organizationId') callerOrgId?: string,
    @GetUser('role') callerRole?: UserRole,
  ) {
    return this.usersService.deleteAgent(id, callerUserId, callerOrgId, callerRole);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Get user details by ID' })
  async findOne(
    @Param('id') id: string,
    @GetUser('organizationId') orgId?: string,
    @GetUser('role') role?: UserRole,
  ) {
    const effectiveOrgId = role === UserRole.SUPER_ADMIN ? undefined : orgId;
    return this.usersService.findOne(id, effectiveOrgId);
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Update user role (RBAC)' })
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @GetUser('organizationId') orgId?: string,
    @GetUser('role') userRole?: UserRole,
  ) {
    const effectiveOrgId = userRole === UserRole.SUPER_ADMIN ? undefined : orgId;
    return this.usersService.updateRole(id, role, effectiveOrgId);
  }
}
