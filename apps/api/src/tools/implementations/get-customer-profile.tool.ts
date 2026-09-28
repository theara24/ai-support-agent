import { Injectable } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition } from '@ai-support/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GetCustomerProfileTool implements IAgentTool {
  readonly definition: LLMToolDefinition = {
    name: 'getCustomerProfile',
    description: 'Fetches profile metadata and contact information of the current customer in conversation.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  constructor(private prisma: PrismaService) {}

  async execute(_params: Record<string, any>, context: ToolExecutionContext): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: context.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        telegramChatId: true,
        createdAt: true,
      },
    });

    return customer || { message: 'Customer profile not found' };
  }
}
