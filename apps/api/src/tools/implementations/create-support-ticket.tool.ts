import { Injectable } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition, TicketStatus, TicketPriority } from '@ai-support/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreateSupportTicketTool implements IAgentTool {
  readonly definition: LLMToolDefinition = {
    name: 'createSupportTicket',
    description: 'Creates an official support ticket for complex issues requiring asynchronous resolution by customer support personnel.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'A brief title describing the issue.',
        },
        description: {
          type: 'string',
          description: 'Detailed explanation of the support request.',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Priority level of the support ticket.',
        },
      },
      required: ['title', 'description'],
    },
  };

  constructor(private prisma: PrismaService) {}

  async execute(
    params: { title: string; description: string; priority?: TicketPriority },
    context: ToolExecutionContext,
  ): Promise<any> {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: params.title,
        description: params.description,
        priority: params.priority || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        customerId: context.customerId,
        conversationId: context.conversationId,
        organizationId: context.organizationId,
      },
    });

    return {
      ticketId: ticket.id,
      status: ticket.status,
      title: ticket.title,
      message: `Support ticket #${ticket.id.slice(0, 8)} successfully created.`,
    };
  }
}
