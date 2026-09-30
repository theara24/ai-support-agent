import { Injectable, Logger } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition } from '@ai-support/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GetOrderStatusTool implements IAgentTool {
  private readonly logger = new Logger(GetOrderStatusTool.name);

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

  // Pre-configured demo orders strictly reserved for authorized sandbox/demo tenants
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

  constructor(private readonly prisma: PrismaService) {}

  async execute(params: { orderId: string }, context: ToolExecutionContext): Promise<any> {
    const rawOrderId = params?.orderId?.trim();
    if (!rawOrderId) {
      return {
        found: false,
        message: 'Invalid order lookup request: orderId is required.',
      };
    }

    const key = rawOrderId.toUpperCase();

    // Verify whether the current tenant is an authorized demo/sandbox tenant
    let isDemoTenant = false;

    if (context.organizationId) {
      try {
        const organization = await this.prisma.organization.findUnique({
          where: { id: context.organizationId },
          select: { id: true, slug: true },
        });
        isDemoTenant = organization?.slug === 'demo' || organization?.slug === 'acme-support';
      } catch (err: any) {
        this.logger.warn(`Failed to inspect organization for demo status: ${err.message}`);
      }
    } else if (process.env.NODE_ENV !== 'production' || process.env.AI_PROVIDER === 'demo') {
      // In local dev/test or explicit demo mode with no organization context
      isDemoTenant = true;
    }

    // In demo mode, only resolve known demo orders
    if (isDemoTenant && this.DEMO_ORDERS[key]) {
      return {
        found: true,
        ...this.DEMO_ORDERS[key],
      };
    }

    // In all other cases (production tenants or nonexistent orders): return clear "Order not found"
    // Never return fabricated tracking or status data in production.
    return {
      found: false,
      orderId: rawOrderId,
      message: `Order "${rawOrderId}" was not found. Please verify the order ID and try again.`,
    };
  }
}
