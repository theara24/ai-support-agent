import { Injectable } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class GetOrderStatusTool implements IAgentTool {
  readonly definition: LLMToolDefinition = {
    name: 'getOrderStatus',
    description: 'Queries status, tracking number, items, and delivery estimate for a customer order by order ID (e.g., ACME-1001, ACME-1002, ACME-1003).',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order identifier to look up, e.g. ACME-1001.',
        },
      },
      required: ['orderId'],
    },
  };

  private readonly DEMO_ORDERS: Record<string, any> = {
    'ACME-1001': {
      orderId: 'ACME-1001',
      status: 'SHIPPED',
      carrier: 'FedEx',
      trackingNumber: 'FDX-ACME-1001-99',
      estimatedDelivery: 'In 2 business days',
      items: ['Acme Wireless Ergonomic Keyboard', 'USB-C Fast Charging Cable'],
      totalAmount: '$89.99',
    },
    'ACME-1002': {
      orderId: 'ACME-1002',
      status: 'PROCESSING',
      carrier: 'UPS',
      trackingNumber: 'PENDING_DISPATCH',
      estimatedDelivery: 'Dispatches tomorrow from Central Distribution Center',
      items: ['Acme 4K Ultra-HD Webcam with Noise-Cancelling Mic'],
      totalAmount: '$129.50',
    },
    'ACME-1003': {
      orderId: 'ACME-1003',
      status: 'DELIVERED',
      carrier: 'DHL Express',
      trackingNumber: 'DHL-ACME-1003-77',
      estimatedDelivery: 'Delivered yesterday at front porch',
      items: ['Acme Dual Monitor Desk Mount Arm'],
      totalAmount: '$74.00',
    },
  };

  async execute(params: { orderId: string }, context: ToolExecutionContext): Promise<any> {
    const key = (params.orderId || '').trim().toUpperCase();
    if (this.DEMO_ORDERS[key]) {
      return this.DEMO_ORDERS[key];
    }

    return {
      orderId: params.orderId,
      status: 'SHIPPED',
      carrier: 'FedEx',
      trackingNumber: `TRACK-${key}-99`,
      estimatedDelivery: 'Estimated within 2-3 business days',
      items: ['Acme Support Standard Package'],
      totalAmount: '$49.99',
    };
  }
}
