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
      const provider = this.llmProviderFactory.getProvider();
      const queryEmbedding = await provider.generateEmbeddings(query);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // Perform pgvector cosine distance search (<=>)
      const vectorResults: Array<{
        id: string;
        content: string;
        documentTitle: string;
        distance: number;
      }> = await this.prisma.$queryRaw`
        SELECT 
          c.id,
          c.content,
          d.title as "documentTitle",
          (c.embedding <=> ${vectorString}::vector) as distance
        FROM document_chunks c
        JOIN knowledge_documents d ON c."documentId" = d.id
        WHERE d.status = 'READY'
          ${context.organizationId ? Prisma.sql`AND d."organizationId" = ${context.organizationId}` : Prisma.empty}
        ORDER BY distance ASC
        LIMIT ${limit};
      `;

      if (vectorResults && vectorResults.length > 0) {
        return {
          results: vectorResults.map((r) => ({
            documentTitle: r.documentTitle,
            content: r.content,
            distance: Number(r.distance),
          })),
        };
      }
    } catch (err) {
      this.logger.warn('pgvector search query failed or unindexed, falling back to text match', err);
    }

    // Fallback: Text matching if pgvector table is unpopulated or vector extension error occurs
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' },
        ...(context.organizationId
          ? { document: { organizationId: context.organizationId } }
          : {}),
      },
      include: {
        document: { select: { title: true } },
      },
      take: limit,
    });

    return {
      results: chunks.map((c) => ({
        documentTitle: c.document.title,
        content: c.content,
        distance: 0,
      })),
    };
  }
}
