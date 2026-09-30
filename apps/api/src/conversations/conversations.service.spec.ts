import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiAgentService } from '../ai/ai-agent.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { ConversationStatus, MessageSenderType, UserRole, ConversationChannel } from '@ai-support/types';
import { NotFoundException } from '@nestjs/common';

import { TelegramService } from '../telegram/telegram.service';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const mockPrisma = {
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    conversation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  };

  const mockAiAgentService = {
    processIncomingMessage: jest.fn().mockResolvedValue('AI Response'),
  };

  const mockMessagesGateway = {
    emitNewMessage: jest.fn(),
    emitStatusChange: jest.fn(),
    emitTyping: jest.fn(),
  };

  const mockTelegramService = {
    sendTelegramMessage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiAgentService, useValue: mockAiAgentService },
        { provide: MessagesGateway, useValue: mockMessagesGateway },
        { provide: TelegramService, useValue: mockTelegramService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create new customer and conversation when customerId is not provided', async () => {
      mockPrisma.customer.create.mockResolvedValue({ id: 'cust-1', name: 'Web Visitor' });
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conv-1',
        customerId: 'cust-1',
        status: ConversationStatus.AI_ACTIVE,
      });

      const res = await service.create({ customerName: 'Web Visitor', channel: ConversationChannel.WEB }, 'org-1');
      expect(res.id).toBe('conv-1');
      expect(mockMessagesGateway.emitStatusChange).toHaveBeenCalledWith('conv-1', ConversationStatus.AI_ACTIVE);
    });
  });

  describe('findOne & Privacy Filtering', () => {
    it('should hide internal notes from regular customers', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        organizationId: 'org-1',
        customerId: 'cust-1',
        status: ConversationStatus.AI_ACTIVE,
        messages: [
          { id: 'm1', content: 'Customer question', isInternalNote: false },
          { id: 'm2', content: 'Secret internal note for team', isInternalNote: true },
          { id: 'm3', content: 'AI public answer', isInternalNote: false },
        ],
      });

      // Anonymous / customer access
      const res = await service.findOne('conv-1', 'org-1', undefined);
      expect(res.messages.length).toBe(2);
      expect(res.messages.some((m: any) => m.isInternalNote)).toBe(false);
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'conv-1', organizationId: 'org-1' },
        include: expect.any(Object),
      });
    });

    it('should show internal notes to authenticated support agents', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        organizationId: 'org-1',
        customerId: 'cust-1',
        status: ConversationStatus.HUMAN_ACTIVE,
        messages: [
          { id: 'm1', content: 'Customer question', isInternalNote: false },
          { id: 'm2', content: 'Secret internal note for team', isInternalNote: true },
        ],
      });

      const agentUser = {
        id: 'agent-1',
        email: 'agent@company.com',
        role: UserRole.SUPPORT_AGENT,
      };

      const res = await service.findOne('conv-1', 'org-1', agentUser);
      expect(res.messages.length).toBe(2);
      expect(res.messages.some((m: any) => m.isInternalNote)).toBe(true);
    });

    it('should throw NotFoundException if conversation belongs to another organization (IDOR prevention)', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      await expect(service.findOne('conv-1', 'wrong-org', undefined)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'conv-1', organizationId: 'wrong-org' },
        include: expect.any(Object),
      });
    });
  });

  describe('takeover', () => {
    it('should update status to HUMAN_ACTIVE and post system note', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1', organizationId: 'org-1', status: ConversationStatus.AI_ACTIVE });
      mockPrisma.conversation.update.mockResolvedValue({
        id: 'conv-1',
        status: ConversationStatus.HUMAN_ACTIVE,
        assignedAgentId: 'agent-1',
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 'm-sys',
        content: 'Conversation taken over by Support Agent',
        isInternalNote: true,
      });

      const res = await service.takeover('conv-1', 'agent-1', 'org-1');
      expect(res.status).toBe(ConversationStatus.HUMAN_ACTIVE);
      expect(mockMessagesGateway.emitStatusChange).toHaveBeenCalledWith('conv-1', ConversationStatus.HUMAN_ACTIVE);
      expect(mockMessagesGateway.emitNewMessage).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update status to RESOLVED and broadcast event', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1', organizationId: 'org-1', status: ConversationStatus.HUMAN_ACTIVE });
      mockPrisma.conversation.update.mockResolvedValue({
        id: 'conv-1',
        status: ConversationStatus.RESOLVED,
      });

      const res = await service.updateStatus('conv-1', { status: ConversationStatus.RESOLVED }, 'org-1');
      expect(res.status).toBe(ConversationStatus.RESOLVED);
      expect(mockMessagesGateway.emitStatusChange).toHaveBeenCalledWith('conv-1', ConversationStatus.RESOLVED);
    });
  });
});
