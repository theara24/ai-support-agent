import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, ConversationChannel } from '@ai-support/types';

describe('AnalyticsController & AnalyticsService', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockPrisma = {
    conversation: {
      count: jest.fn(),
    },
    ticket: {
      count: jest.fn(),
    },
    aIUsage: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should query database models and calculate real operational metrics', async () => {
      // Mock database counts
      mockPrisma.conversation.count
        .mockResolvedValueOnce(10) // totalConversations
        .mockResolvedValueOnce(7)  // aiResolvedCount (status = RESOLVED)
        .mockResolvedValueOnce(2)  // humanEscalatedCount
        .mockResolvedValueOnce(8)  // channelWebCount
        .mockResolvedValueOnce(2); // channelTelegramCount

      mockPrisma.ticket.count.mockResolvedValueOnce(3); // openTicketsCount

      mockPrisma.aIUsage.aggregate.mockResolvedValueOnce({
        _sum: {
          totalTokens: 1250,
          costEstimate: 0.00125,
        },
      });

      const result = await controller.getOverview('org-1');

      expect(result).toEqual({
        totalConversations: 10,
        aiResolvedConversations: 7,
        humanEscalations: 2,
        openTickets: 3,
        resolutionRate: 70, // (7 / 10) * 100
        totalTokens: 1250,
        estimatedCost: 0.00125,
        channelBreakdown: {
          web: 8,
          telegram: 2,
        },
      });

      expect(mockPrisma.conversation.count).toHaveBeenCalledTimes(5);
      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', status: 'OPEN' },
      });
      expect(mockPrisma.aIUsage.aggregate).toHaveBeenCalled();
    });

    it('should return 0 resolutionRate when totalConversations is 0 without dividing by zero', async () => {
      mockPrisma.conversation.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrisma.ticket.count.mockResolvedValueOnce(0);
      mockPrisma.aIUsage.aggregate.mockResolvedValueOnce({
        _sum: { totalTokens: null, costEstimate: null },
      });

      const result = await service.getOverview();

      expect(result.totalConversations).toBe(0);
      expect(result.resolutionRate).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.estimatedCost).toBe(0);
    });
  });
});
