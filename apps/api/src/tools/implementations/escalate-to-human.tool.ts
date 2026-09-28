import { Injectable } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition, ConversationStatus } from '@ai-support/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EscalateToHumanTool implements IAgentTool {
  readonly definition: LLMToolDefinition = {
    name: 'escalateToHuman',
    description: 'Escalates the current customer conversation to a live human support agent when the AI cannot satisfy the user or when requested.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'The specific reason why human escalation is required.',
        },
      },
      required: ['reason'],
    },
  };

  constructor(private prisma: PrismaService) {}

  async execute(params: { reason: string }, context: ToolExecutionContext): Promise<any> {
    await this.prisma.conversation.update({
      where: { id: context.conversationId },
      data: {
        status: ConversationStatus.WAITING_FOR_AGENT,
      },
    });

    // Post internal system note regarding handoff reason
    await this.prisma.message.create({
      data: {
        conversationId: context.conversationId,
        senderType: 'SYSTEM',
        content: `Conversation escalated to human agent. Reason: ${params.reason}`,
        isInternalNote: true,
      },
    });

    return {
      status: 'escalated',
      conversationStatus: ConversationStatus.WAITING_FOR_AGENT,
      message: 'Conversation successfully marked as WAITING_FOR_AGENT. A human support staff member has been notified.',
    };
  }
}
