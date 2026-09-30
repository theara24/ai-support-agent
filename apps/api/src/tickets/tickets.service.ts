import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, UpdateTicketDto, CreateTicketCommentDto } from './dto/ticket.dto';
import { TicketStatus } from '@ai-support/types';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTicketDto, customerIdFromUser?: string, orgId?: string) {
    const custId = dto.customerId || customerIdFromUser;
    if (!custId) {
      const newCust = await this.prisma.customer.create({
        data: { name: 'Support Requester', organizationId: orgId },
      });
      dto.customerId = newCust.id;
    } else if (orgId) {
      const cust = await this.prisma.customer.findFirst({
        where: { id: custId, organizationId: orgId },
      });
      if (!cust) {
        throw new NotFoundException(`Customer with ID ${custId} not found`);
      }
    }

    if (dto.conversationId && orgId) {
      const conv = await this.prisma.conversation.findFirst({
        where: { id: dto.conversationId, organizationId: orgId },
      });
      if (!conv) {
        throw new NotFoundException(`Conversation with ID ${dto.conversationId} not found`);
      }
    }

    return this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        status: TicketStatus.OPEN,
        customerId: dto.customerId || custId!,
        conversationId: dto.conversationId,
        organizationId: orgId,
      },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findAll(status?: TicketStatus, orgId?: string) {
    return this.prisma.ticket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    if (!organizationId) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.ticket.update({
      where: { id },
      data: { ...dto },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async addComment(ticketId: string, authorId: string, dto: CreateTicketCommentDto, organizationId: string) {
    await this.findOne(ticketId, organizationId);
    return this.prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        content: dto.content,
      },
    });
  }
}
