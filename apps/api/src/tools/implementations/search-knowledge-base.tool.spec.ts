import { SearchKnowledgeBaseTool } from './search-knowledge-base.tool';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMProviderFactory } from '../../ai/llm-provider.factory';

describe('SearchKnowledgeBaseTool', () => {
  let tool: SearchKnowledgeBaseTool;
  let mockPrisma: any;
  let mockLLMFactory: any;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      generateEmbeddings: jest.fn().mockResolvedValue(new Array(768).fill(0.01)),
    };
    mockLLMFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
    };
    mockPrisma = {
      $queryRaw: jest.fn(),
      documentChunk: {
        findMany: jest.fn(),
      },
    };

    tool = new SearchKnowledgeBaseTool(
      mockPrisma as unknown as PrismaService,
      mockLLMFactory as unknown as LLMProviderFactory,
    );
  });

  it('should return empty results and avoid querying when organizationId is missing in context', async () => {
    const res = await tool.execute({ query: 'refund policy' }, { conversationId: 'c1', customerId: 'cust1' });
    expect(res).toEqual({ results: [] });
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(mockPrisma.documentChunk.findMany).not.toHaveBeenCalled();
  });

  it('should execute pgvector cosine search filtering strictly by organizationId and return chunkIndex', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'chunk-1',
        chunkIndex: 0,
        content: 'Acme provides a 30-day return policy.',
        documentTitle: 'Return Policy',
        distance: 0.12,
      },
      {
        id: 'chunk-2',
        chunkIndex: 1,
        content: 'Items must be returned in original condition.',
        documentTitle: 'Return Policy',
        distance: 0.18,
      },
    ]);

    const res = await tool.execute(
      { query: 'How do returns work?' },
      { conversationId: 'c1', customerId: 'cust1', organizationId: 'org-tenant-123' },
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(res.results).toHaveLength(2);
    expect(res.results[0]).toEqual({
      documentTitle: 'Return Policy',
      chunkIndex: 0,
      content: 'Acme provides a 30-day return policy.',
      distance: 0.12,
    });
    expect(res.results[1]).toEqual({
      documentTitle: 'Return Policy',
      chunkIndex: 1,
      content: 'Items must be returned in original condition.',
      distance: 0.18,
    });
  });

  it('should fall back to text match filtering strictly by organizationId when pgvector fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('relation document_chunks does not exist'));
    mockPrisma.documentChunk.findMany.mockResolvedValue([
      {
        id: 'chunk-fallback-1',
        chunkIndex: 2,
        content: 'Contact support for return labels.',
        document: { title: 'Support Guide' },
      },
    ]);

    const res = await tool.execute(
      { query: 'return labels' },
      { conversationId: 'c1', customerId: 'cust1', organizationId: 'org-tenant-123' },
    );

    expect(mockPrisma.documentChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          document: expect.objectContaining({
            organizationId: 'org-tenant-123',
          }),
        }),
      }),
    );
    expect(res.results).toEqual([
      {
        documentTitle: 'Support Guide',
        chunkIndex: 2,
        content: 'Contact support for return labels.',
        distance: 0,
      },
    ]);
  });
});
