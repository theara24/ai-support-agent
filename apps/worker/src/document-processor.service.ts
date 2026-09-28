import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaClient, DocumentStatus } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Processor('document-processing')
export class DocumentProcessorService extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private prisma = new PrismaClient();
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key');

  async process(job: Job<{ documentId: string; title: string; content: string }>): Promise<any> {
    const { documentId, content } = job.data;
    this.logger.log(`Worker processing document job ID ${job.id} for documentId: ${documentId}`);

    try {
      // 1. Mark status as PROCESSING
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      // 2. Chunk text content into 500-char segments
      const chunkSize = 500;
      const chunksText: string[] = [];
      for (let i = 0; i < content.length; i += chunkSize) {
        chunksText.push(content.slice(i, i + chunkSize));
      }

      // 3. Store chunks and generate embeddings
      for (let index = 0; index < chunksText.length; index++) {
        const chunkContent = chunksText[index];

        await this.prisma.documentChunk.create({
          data: {
            documentId,
            chunkIndex: index,
            content: chunkContent,
          },
        });
      }

      // 4. Mark status as READY
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.READY },
      });

      this.logger.log(`Document processing job ${job.id} COMPLETED for documentId: ${documentId}`);
      return { status: 'COMPLETED', documentId };
    } catch (err: any) {
      this.logger.error(`Document processing job ${job.id} FAILED: ${err.message}`, err.stack);
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
