import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiAgentService } from '../ai/ai-agent.service';
import {
  CreateConversationDto,
  UpdateConversationStatusDto,
  AssignAgentDto,
  CreateMessageDto,
} from './dto/conversation.dto';
import { ConversationStatus, MessageSenderType, ConversationChannel } from '@ai-support/types';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private aiAgentService: AiAgentService,
  ) {}

  async create(dto: CreateConversationDto, orgId?: string) {
    let customerId = dto.customerId;

    if (!customerId) {
      const customer = await this.prisma.customer.create({
        data: {
          name: dto.customerName || 'Anonymous Web Visitor',
          email: dto.customerEmail,
          organizationId: orgId,
        },
      });
      customerId = customer.id;
    }

    return this.prisma.conversation.create({
      data: {
        channel: dto.channel || ConversationChannel.WEB,
        status: ConversationStatus.AI_ACTIVE,
        customerId,
        organizationId: orgId,
      },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findAll(status?: ConversationStatus, channel?: ConversationChannel, orgId?: string) {
    return this.prisma.conversation.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(channel ? { channel } : {}),
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        tickets: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return conversation;
  }

  async addMessage(conversationId: string, dto: CreateMessageDto, senderType: MessageSenderType, senderId?: string) {
    const conversation = await this.findOne(conversationId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType,
        senderId,
        content: dto.content,
        isInternalNote: dto.isInternalNote || false,
      },
    });

    // Update conversation updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // If message is from customer and AI is active & not an internal note, trigger AI Agent
    if (senderType === MessageSenderType.CUSTOMER && conversation.status === ConversationStatus.AI_ACTIVE && !dto.isInternalNote) {
      // Trigger AI Agent asynchronously
      this.aiAgentService.processIncomingMessage(conversationId, dto.content).catch((err) => {
        console.error('AI Agent error processing message:', err);
      });
    }

    return message;
  }

  async updateStatus(id: string, dto: UpdateConversationStatusDto) {
    await this.findOne(id);
    return this.prisma.conversation.update({
      where: { id },
      data: { status: dto.status },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async takeover(id: string, agentId: string) {
    await this.findOne(id);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: ConversationStatus.HUMAN_ACTIVE,
        assignedAgentId: agentId,
      },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Post internal system note regarding takeover
    await this.prisma.message.create({
      data: {
        conversationId: id,
        senderType: MessageSenderType.SYSTEM,
        content: `Conversation taken over by Support Agent (ID: ${agentId}). AI response mode paused.`,
        isInternalNote: true,
      },
    });

    return updated;
  }

  async assignAgent(id: string, dto: AssignAgentDto) {
    await this.findOne(id);
    return this.prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: dto.agentId },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}
