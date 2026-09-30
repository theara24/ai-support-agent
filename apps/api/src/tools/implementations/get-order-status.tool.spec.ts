import { GetOrderStatusTool } from './get-order-status.tool';
import { PrismaService } from '../../prisma/prisma.service';

describe('GetOrderStatusTool', () => {
  let tool: GetOrderStatusTool;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: jest.fn(),
      },
    };
    tool = new GetOrderStatusTool(mockPrisma as unknown as PrismaService);
  });

  it('should return demo order details when tenant is authorized demo tenant and order exists', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-demo',
      slug: 'acme-support',
    });

    const res = await tool.execute(
      { orderId: 'ACME-1001' },
      { conversationId: 'c1', customerId: 'cust1', organizationId: 'org-demo' },
    );

    expect(res.found).toBe(true);
    expect(res.orderId).toBe('ACME-1001');
    expect(res.status).toBe('SHIPPED');
    expect(res.carrier).toBe('FedEx');
  });

  it('should return Order not found when tenant is demo tenant but order ID does not exist', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-demo',
      slug: 'demo',
    });

    const res = await tool.execute(
      { orderId: 'UNKNOWN-999' },
      { conversationId: 'c1', customerId: 'cust1', organizationId: 'org-demo' },
    );

    expect(res.found).toBe(false);
    expect(res.orderId).toBe('UNKNOWN-999');
    expect(res.message).toContain('was not found');
    expect(res.status).toBeUndefined(); // Crucial: no fabricated status
    expect(res.carrier).toBeUndefined(); // Crucial: no fabricated carrier
  });

  it('should reject DEMO_ORDERS and return Order not found for production non-demo tenants', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-prod',
      slug: 'enterprise-client-xyz',
    });

    const res = await tool.execute(
      { orderId: 'ACME-1001' },
      { conversationId: 'c1', customerId: 'cust1', organizationId: 'org-prod' },
    );

    expect(res.found).toBe(false);
    expect(res.orderId).toBe('ACME-1001');
    expect(res.message).toContain('was not found');
    expect(res.carrier).toBeUndefined();
  });

  it('should return clean validation failure when orderId is empty', async () => {
    const res = await tool.execute(
      { orderId: '' },
      { conversationId: 'c1', customerId: 'cust1' },
    );

    expect(res.found).toBe(false);
    expect(res.message).toContain('orderId is required');
  });
});
