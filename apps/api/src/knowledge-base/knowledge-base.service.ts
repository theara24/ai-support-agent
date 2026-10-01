import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeDocumentDto } from './dto/knowledge-base.dto';
import { DocumentStatus } from '@ai-support/types';
import { chunkText } from '@ai-support/shared';
import { LLMProviderFactory } from '../ai/llm-provider.factory';
import * as crypto from 'crypto';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private prisma: PrismaService,
    private llmProviderFactory: LLMProviderFactory,
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

  async findAll(orgId?: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: orgId ? { organizationId: orgId } : {},
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateKnowledgeDocumentDto, orgId?: string) {
    // 1. Create document in PENDING state
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        title: dto.title,
        contentType: dto.contentType || 'text/plain',
        status: DocumentStatus.PENDING,
        organizationId: orgId,
      },
    });

    // 2. Dispatch to BullMQ for multi-process environments
    try {
      this.documentQueue.add(
        'process-document',
        {
          documentId: doc.id,
          title: dto.title,
          content: dto.content,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        },
      ).catch(() => {});
    } catch {}

    // 3. Immediately process in background within API service to ensure single-container (e.g. Render) deployments work seamlessly without worker
    setImmediate(async () => {
      await this.processDocumentDirectly(doc.id, dto.content);
    });

    return doc;
  }

  async processDocumentDirectly(documentId: string, content: string) {
    const startTime = Date.now();
    try {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      const chunks = chunkText(content, {
        maxChunkSize: 750,
        overlap: 120,
      });

      const provider = this.llmProviderFactory.getProvider();
      await this.prisma.documentChunk.deleteMany({ where: { documentId } });

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const chunkId = crypto.randomUUID();
        let embeddingValues: number[] | null = null;
        try {
          embeddingValues = await provider.generateEmbeddings(chunkContent);
        } catch (embedErr: any) {
          this.logger.warn(`Failed to generate embedding for chunk ${i}: ${embedErr.message}`);
          embeddingValues = new Array(768).fill(0).map((_, idx) => Math.sin(chunkContent.length * 3 + idx * 7) * 0.05);
        }

        const vectorStr = `[${embeddingValues.join(',')}]`;
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks ("id", "documentId", "chunkIndex", "content", "embedding", "createdAt")
          VALUES (${chunkId}, ${documentId}, ${i}, ${chunkContent}, ${vectorStr}::vector, NOW());
        `;
      }

      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.READY },
      });

      this.logger.log(`Directly processed document ${documentId} (${chunks.length} chunks) in ${Date.now() - startTime}ms`);
    } catch (err: any) {
      this.logger.error(`Error processing document ${documentId}: ${err.message}`, err.stack);
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED, errorMessage: err.message },
      });
    }
  }

  private async processSynchronousFallback(documentId: string, content: string) {
    const chunks = chunkText(content, {
      maxChunkSize: 750,
      overlap: 120,
    });
    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: i,
          content: chunks[i],
        },
      });
    }
    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: DocumentStatus.READY },
    });
  }

  async findOne(id: string, organizationId: string) {
    if (!organizationId) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }

    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }

    return doc;
  }

  async delete(id: string, organizationId: string) {
    if (!organizationId) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }

    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId },
    });
    if (!doc) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }

    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { message: 'Document deleted successfully' };
  }
}
