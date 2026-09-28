import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, ConversationChannel } from '@ai-support/types';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(orgId?: string) {
    const whereOrg = orgId ? { organizationId: orgId } : {};

    const [
      totalConversations,
      aiResolvedCount,
      humanEscalatedCount,
      openTicketsCount,
      aiUsageAggregate,
      channelWebCount,
      channelTelegramCount,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: whereOrg }),
      this.prisma.conversation.count({
        where: { ...whereOrg, status: ConversationStatus.RESOLVED },
      }),
      this.prisma.conversation.count({
        where: {
          ...whereOrg,
          status: { in: [ConversationStatus.WAITING_FOR_AGENT, ConversationStatus.HUMAN_ACTIVE] },
        },
      }),
      this.prisma.ticket.count({
        where: { ...whereOrg, status: 'OPEN' },
      }),
      this.prisma.aIUsage.aggregate({
        _sum: {
          totalTokens: true,
          costEstimate: true,
        },
        where: orgId ? { conversation: { organizationId: orgId } } : {},
      }),
      this.prisma.conversation.count({
        where: { ...whereOrg, channel: ConversationChannel.WEB },
      }),
      this.prisma.conversation.count({
        where: { ...whereOrg, channel: ConversationChannel.TELEGRAM },
      }),
    ]);

    return {
      totalConversations,
      aiResolvedConversations: aiResolvedCount,
      humanEscalations: humanEscalatedCount,
      openTickets: openTicketsCount,
      resolutionRate:
        totalConversations > 0 ? (aiResolvedCount / totalConversations) * 100 : 0,
      totalTokens: aiUsageAggregate._sum.totalTokens || 0,
      estimatedCost: aiUsageAggregate._sum.costEstimate || 0,
      channelBreakdown: {
        web: channelWebCount,
        telegram: channelTelegramCount,
      },
    };
  }
}
