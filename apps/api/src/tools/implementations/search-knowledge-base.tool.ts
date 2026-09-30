import { Injectable, Logger } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition } from '@ai-support/types';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMProviderFactory } from '../../ai/llm-provider.factory';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchKnowledgeBaseTool implements IAgentTool {
  private readonly logger = new Logger(SearchKnowledgeBaseTool.name);

  readonly definition: LLMToolDefinition = {
    name: 'searchKnowledgeBase',
    description: 'Searches company documentation and FAQs for accurate answers regarding procedures, pricing, or product rules using vector semantic search.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or keyword to look up in the knowledge base.',
        },
        limit: {
          type: 'number',
          description: 'Top-K relevant results count (default 4)',
        },
      },
      required: ['query'],
    },
  };

  constructor(
    private prisma: PrismaService,
    private llmProviderFactory: LLMProviderFactory,
  ) {}

  async execute(params: { query: string; limit?: number }, context: ToolExecutionContext): Promise<any> {
    const query = params.query;
    const limit = params.limit || 4;
    if (!query) return { results: [] };

    try {
      const orgId = context.organizationId;
      if (!orgId) {
        this.logger.warn(
          'searchKnowledgeBase: Missing organizationId in ToolExecutionContext. Aborting search to enforce tenant isolation.',
        );
        return { results: [] };
      }

      const provider = this.llmProviderFactory.getProvider();
      const queryEmbedding = await provider.generateEmbeddings(query);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // Perform pgvector cosine distance search (<=>) strictly scoped to tenant organizationId
      const vectorResults: Array<{
        id: string;
        chunkIndex: number;
        content: string;
        documentTitle: string;
        distance: number;
      }> = await this.prisma.$queryRaw`
        SELECT 
          c.id,
          c."chunkIndex",
          c.content,
          d.title as "documentTitle",
          (c.embedding <=> ${vectorString}::vector) as distance
        FROM document_chunks c
        JOIN knowledge_documents d ON c."documentId" = d.id
        WHERE d.status = 'READY'
          AND d."organizationId" = ${orgId}
        ORDER BY distance ASC
        LIMIT ${limit};
      `;

      if (vectorResults && vectorResults.length > 0) {
        return {
          results: vectorResults.map((r) => ({
            documentTitle: r.documentTitle,
            chunkIndex: r.chunkIndex,
            content: r.content,
            distance: Number(r.distance),
          })),
        };
      }
    } catch (err) {
      this.logger.warn('pgvector search query failed or unindexed, falling back to text match', err);
    }

    const orgId = context.organizationId;
    if (!orgId) {
      return { results: [] };
    }

    // Fallback: Text matching strictly scoped to the tenant organization
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' },
        document: {
          organizationId: orgId,
          status: 'READY' as any,
        },
      },
      include: {
        document: { select: { title: true } },
      },
      take: limit,
      orderBy: { chunkIndex: 'asc' },
    });

    return {
      results: chunks.map((c) => ({
        documentTitle: c.document.title,
        chunkIndex: c.chunkIndex,
        content: c.content,
        distance: 0,
      })),
    };
  }
}
