import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiAgentService } from '../ai/ai-agent.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { TelegramService } from '../telegram/telegram.service';
import {
  CreateConversationDto,
  UpdateConversationStatusDto,
  AssignAgentDto,
  CreateMessageDto,
} from './dto/conversation.dto';
import {
  ConversationStatus,
  MessageSenderType,
  ConversationChannel,
  AuthenticatedUser,
  UserRole,
} from '@ai-support/types';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private aiAgentService: AiAgentService,
    private messagesGateway: MessagesGateway,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
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

    const conversation = await this.prisma.conversation.create({
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

    this.messagesGateway.emitStatusChange(conversation.id, conversation.status);

    return conversation;
  }

  async findAll(status?: ConversationStatus, channel?: ConversationChannel, orgId?: string) {
    return this.prisma.conversation.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(channel ? { channel } : {}),
        ...(orgId
          ? {
              OR: [{ organizationId: orgId }, { organizationId: null }],
            }
          : {}),
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

  async findOne(id: string, user?: AuthenticatedUser) {
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

    // Security check: non-agents (or anonymous web customers) must not see internal notes
    const isAgent =
      user &&
      (user.role === UserRole.SUPPORT_AGENT ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN);

    if (!isAgent) {
      return {
        ...conversation,
        messages: conversation.messages.filter((m) => !m.isInternalNote),
      };
    }

    return conversation;
  }

  async addMessage(
    conversationId: string,
    dto: CreateMessageDto,
    senderType: MessageSenderType,
    senderId?: string,
    skipAiAutoTrigger = false,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

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

    // Real-Time Socket.IO broadcast
    this.messagesGateway.emitNewMessage(conversationId, message);

    // If message is from customer and AI is active & not an internal note, trigger AI Agent
    if (
      !skipAiAutoTrigger &&
      senderType === MessageSenderType.CUSTOMER &&
      conversation.status === ConversationStatus.AI_ACTIVE &&
      !dto.isInternalNote
    ) {
      this.messagesGateway.emitTyping(conversationId, true, 'AI Assistant');
      this.aiAgentService
        .processIncomingMessage(conversationId, dto.content)
        .catch((err) => {
          console.error('AI Agent error processing message:', err);
        })
        .finally(() => {
          this.messagesGateway.emitTyping(conversationId, false, 'AI Assistant');
        });
    }

    // If human agent replied to a Telegram customer, forward message back to Telegram app
    if (
      senderType === MessageSenderType.AGENT &&
      !dto.isInternalNote &&
      conversation.channel === ConversationChannel.TELEGRAM
    ) {
      this.prisma.customer
        .findUnique({ where: { id: conversation.customerId } })
        .then((cust) => {
          if (cust?.telegramChatId) {
            this.telegramService.sendTelegramMessage(cust.telegramChatId, dto.content);
          }
        })
        .catch((err) => {
          this.logger.warn(`Failed forwarding agent message to Telegram: ${err.message}`);
        });
    }

    return message;
  }

  async updateStatus(id: string, dto: UpdateConversationStatusDto) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: dto.status },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    this.messagesGateway.emitStatusChange(id, dto.status);

    return updated;
  }

  async takeover(id: string, agentId: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

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
    const systemNote = await this.prisma.message.create({
      data: {
        conversationId: id,
        senderType: MessageSenderType.SYSTEM,
        content: `Conversation taken over by Support Agent (ID: ${agentId}). AI response mode paused.`,
        isInternalNote: true,
      },
    });

    this.messagesGateway.emitStatusChange(id, ConversationStatus.HUMAN_ACTIVE);
    this.messagesGateway.emitNewMessage(id, systemNote);

    return updated;
  }

  async assignAgent(id: string, dto: AssignAgentDto) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: dto.agentId },
      include: {
        customer: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    this.messagesGateway.emitStatusChange(id, existing.status);

    return updated;
  }
}
