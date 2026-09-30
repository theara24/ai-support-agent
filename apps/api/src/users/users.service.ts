import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { UserRole } from '@ai-support/types';
import { CreateUserDto, UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private messagesGateway: MessagesGateway,
  ) {}

  async findAll(orgId?: string) {
    const users = await this.prisma.user.findMany({
      where: orgId ? { organizationId: orgId } : {},
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const onlineUserIds = new Set(this.messagesGateway.getOnlineUserIds());

    return users.map((u) => ({
      ...u,
      isOnline: onlineUserIds.has(u.id),
    }));
  }

  async findOne(id: string, organizationId?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      ...user,
      isOnline: this.messagesGateway.isUserOnline(user.id),
    };
  }

  async createAgent(dto: CreateUserDto, callerOrgId?: string, callerRole?: UserRole) {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }

    // Role and tenancy assignment
    let targetOrgId = callerOrgId;
    let targetRole = dto.role || UserRole.SUPPORT_AGENT;

    if (callerRole === UserRole.SUPER_ADMIN) {
      targetOrgId = dto.organizationId || callerOrgId;
    } else {
      // Non-super-admins can only create agents/admins inside their own organization
      targetOrgId = callerOrgId;
      if (targetRole === UserRole.SUPER_ADMIN) {
        throw new BadRequestException('Cannot create Super Admin user');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        role: targetRole as any,
        organizationId: targetOrgId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const userWithOnline = {
      ...user,
      isOnline: this.messagesGateway.isUserOnline(user.id),
    };

    this.messagesGateway.emitTeamMemberCreated(targetOrgId, userWithOnline);

    return userWithOnline;
  }

  async deleteAgent(id: string, callerUserId: string, callerOrgId?: string, callerRole?: UserRole) {
    if (id === callerUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, organizationId: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (callerRole !== UserRole.SUPER_ADMIN) {
      if (user.organizationId !== callerOrgId) {
        throw new BadRequestException('You do not have permission to delete this user');
      }
      if (user.role === UserRole.SUPER_ADMIN) {
        throw new BadRequestException('Cannot delete Super Admin');
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });

    this.messagesGateway.emitTeamMemberDeleted(user.organizationId || undefined, id);

    return {
      message: `User ${user.email} removed successfully`,
      id,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException(`User not found`);
    }

    if (dto.email && dto.email.toLowerCase().trim() !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (emailTaken) {
        throw new ConflictException(`Email address "${dto.email}" is already in use`);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.toLowerCase().trim() } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const userWithOnline = {
      ...updated,
      isOnline: this.messagesGateway.isUserOnline(updated.id),
    };

    this.messagesGateway.emitTeamMemberUpdated(updated.organizationId || undefined, userWithOnline);

    return userWithOnline;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async updateRole(id: string, role: UserRole, organizationId?: string) {
    await this.findOne(id, organizationId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        organizationId: true,
      },
    });

    this.messagesGateway.emitTeamMemberUpdated(updated.organizationId || undefined, updated);

    return updated;
  }

  async getStats(callerOrgId?: string, callerRole?: UserRole) {
    const effectiveOrgId = callerRole === UserRole.SUPER_ADMIN ? undefined : callerOrgId;

    const whereOrg = effectiveOrgId ? { organizationId: effectiveOrgId } : {};

    const [totalUsers, totalAgents, totalCustomers, activeConversations] = await Promise.all([
      this.prisma.user.count({
        where: whereOrg,
      }),
      this.prisma.user.count({
        where: {
          ...whereOrg,
          role: { in: ['SUPPORT_AGENT', 'ADMIN', 'SUPER_ADMIN'] as any },
        },
      }),
      this.prisma.customer.count({
        where: whereOrg,
      }),
      this.prisma.conversation.count({
        where: {
          ...whereOrg,
          status: { in: ['OPEN', 'AI_ACTIVE', 'WAITING_FOR_AGENT', 'HUMAN_ACTIVE'] as any },
        },
      }),
    ]);

    const { onlineUsers, onlineAgents } = this.messagesGateway.getOnlineCounts(effectiveOrgId);

    return {
      totalUsers,
      totalAgents,
      totalCustomers,
      activeConversations,
      onlineUsers,
      onlineAgents,
      onlineUserIds: this.messagesGateway.getOnlineUserIds(),
    };
  }
}
