import { Injectable } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class GetOrderStatusTool implements IAgentTool {
  readonly definition: LLMToolDefinition = {
    name: 'getOrderStatus',
    description: 'Queries status, tracking number, and delivery estimate for a customer order by order ID.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order identifier to look up.',
        },
      },
      required: ['orderId'],
    },
  };

  async execute(params: { orderId: string }, context: ToolExecutionContext): Promise<any> {
    return {
      orderId: params.orderId,
      status: 'SHIPPED',
      carrier: 'FedEx',
      trackingNumber: `TRACK-${params.orderId.toUpperCase()}-99`,
      estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
    };
  }
}
