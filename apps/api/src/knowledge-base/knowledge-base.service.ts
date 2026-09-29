import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeDocumentDto } from './dto/knowledge-base.dto';
import { DocumentStatus } from '@ai-support/types';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private prisma: PrismaService,
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

    // 2. Dispatch to BullMQ with 1s timeout race to synchronous fallback
    const addPromise = this.documentQueue.add(
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
    );

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('BullMQ Redis enqueue timeout')), 1000),
    );

    Promise.race([addPromise, timeoutPromise])
      .then(() => {
        this.logger.log(`Enqueued document processing job for document ${doc.id}`);
      })
      .catch((err: any) => {
        this.logger.warn(`BullMQ enqueue fallback triggered (${err.message}). Processing document...`);
        this.processSynchronousFallback(doc.id, dto.content);
      });

    return doc;
  }

  private async processSynchronousFallback(documentId: string, content: string) {
    const chunkSize = 500;
    for (let i = 0; i < content.length; i += chunkSize) {
      await this.prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: Math.floor(i / chunkSize),
          content: content.slice(i, i + chunkSize),
        },
      });
    }
    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: DocumentStatus.READY },
    });
  }

  async delete(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }

    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { message: 'Document deleted successfully' };
  }
}
