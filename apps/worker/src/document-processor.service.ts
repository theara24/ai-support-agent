import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaClient, DocumentStatus } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as crypto from 'crypto';

import { chunkText } from '@ai-support/shared';

export { chunkText };

@Processor('document-processing')
export class DocumentProcessorService extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private prisma = new PrismaClient();
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key');

  async process(job: Job<{ documentId: string; title: string; content: string }>): Promise<any> {
    const startTime = Date.now();
    const { documentId, content } = job.data;
    this.logger.log(`[Queue Job START] id: ${job.id} | name: ${job.name} | documentId: ${documentId}`);

    try {
      // 1. Mark status as PROCESSING
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      // 2. Chunk text content into semantic, overlapping segments (600–800 chars, 100–150 overlap)
      const chunksText = chunkText(content, {
        maxChunkSize: 750,
        overlap: 120,
      });

      // 3. Store chunks and generate embeddings
      const apiKey = process.env.GEMINI_API_KEY;
      const embeddingModel = (apiKey && apiKey !== 'mock_key' && apiKey !== 'your_gemini_api_key_here')
        ? this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
        : null;

      for (let index = 0; index < chunksText.length; index++) {
        const chunkContent = chunksText[index];
        const chunkId = crypto.randomUUID();
        let embeddingValues: number[] | null = null;

        if (embeddingModel) {
          try {
            const res = await embeddingModel.embedContent({
              content: { role: 'user', parts: [{ text: chunkContent }] },
              outputDimensionality: 768,
            } as any);
            embeddingValues = res.embedding.values;
            this.logger.log(`Generated embedding for chunk ${index} (length: ${embeddingValues.length})`);
          } catch (embedErr: any) {
            this.logger.warn(`Failed to generate embedding for chunk ${index}: ${embedErr.message}`);
          }
        }

        if (embeddingValues) {
          const vectorStr = `[${embeddingValues.join(',')}]`;
          await this.prisma.$executeRaw`
            INSERT INTO document_chunks ("id", "documentId", "chunkIndex", "content", "embedding", "createdAt")
            VALUES (${chunkId}, ${documentId}, ${index}, ${chunkContent}, ${vectorStr}::vector, NOW());
          `;
        } else {
          await this.prisma.documentChunk.create({
            data: {
              id: chunkId,
              documentId,
              chunkIndex: index,
              content: chunkContent,
            },
          });
        }
      }

      // 4. Mark status as READY
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.READY },
      });

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `[Queue Job SUCCESS] id: ${job.id} | name: ${job.name} | documentId: ${documentId} | chunks: ${chunksText.length} | duration: ${durationMs}ms`,
      );
      return { status: 'COMPLETED', documentId, durationMs, chunksCount: chunksText.length };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `[Queue Job FAILED] id: ${job.id} | name: ${job.name} | documentId: ${documentId} | duration: ${durationMs}ms | error: ${err.message}`,
        err.stack,
      );
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: err.message || 'Processing failed',
        },
      });
      throw err;
    }
  }
}
