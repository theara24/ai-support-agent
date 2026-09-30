import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { TicketsService } from '../tickets/tickets.service';
import { SearchKnowledgeBaseTool } from '../tools/implementations/search-knowledge-base.tool';
import { LLMProviderFactory } from '../ai/llm-provider.factory';
import { AiAgentService } from '../ai/ai-agent.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { TelegramService } from '../telegram/telegram.service';
import { DocumentStatus } from '@ai-support/types';
import * as crypto from 'crypto';

describe('Tenant & RAG Isolation Integration Tests (Real Database)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let conversationsService: ConversationsService;
  let ticketsService: TicketsService;
  let searchKnowledgeBaseTool: SearchKnowledgeBaseTool;

  let orgA: any;
  let orgB: any;
  let custA: any;
  let custB: any;
  let convA: any;
  let convB: any;
  let ticketA: any;
  let ticketB: any;
  let docA: any;
  let docB: any;

  beforeAll(async () => {
    // Deterministic mock LLM embedding provider returning normalized 768-dim vector
    const mockLLMProvider = {
      generateEmbeddings: jest.fn().mockResolvedValue(
        new Array(768).fill(0).map((_, i) => Math.sin(i + 1) * 0.05),
      ),
    };

    const mockLLMFactory = {
      getProvider: jest.fn().mockReturnValue(mockLLMProvider),
    };

    const mockAiAgentService = {};
    const mockMessagesGateway = {
      emitNewMessage: jest.fn(),
      emitStatusChange: jest.fn(),
      emitTyping: jest.fn(),
    };
    const mockTelegramService = {};

    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        ConversationsService,
        TicketsService,
        SearchKnowledgeBaseTool,
        { provide: LLMProviderFactory, useValue: mockLLMFactory },
        { provide: AiAgentService, useValue: mockAiAgentService },
        { provide: MessagesGateway, useValue: mockMessagesGateway },
        { provide: TelegramService, useValue: mockTelegramService },
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    conversationsService = moduleRef.get<ConversationsService>(ConversationsService);
    ticketsService = moduleRef.get<TicketsService>(TicketsService);
    searchKnowledgeBaseTool = moduleRef.get<SearchKnowledgeBaseTool>(SearchKnowledgeBaseTool);

    await prisma.$connect();

    // Ensure pgvector extension and HNSW index are active
    try {
      await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx ON document_chunks USING hnsw (embedding vector_cosine_ops);',
      );
    } catch {
      // Ignored if permissions restrict DDL or extension already configured
    }

    const testRunId = Date.now();

    // 1. Seed Tenant Alpha
    orgA = await prisma.organization.create({
      data: {
        name: `Tenant Alpha ${testRunId}`,
        slug: `tenant-alpha-${testRunId}`,
      },
    });

    custA = await prisma.customer.create({
      data: {
        name: 'Alice Alpha',
        email: `alice.${testRunId}@alpha.com`,
        organizationId: orgA.id,
      },
    });

    convA = await prisma.conversation.create({
      data: {
        organizationId: orgA.id,
        customerId: custA.id,
      },
    });

    ticketA = await prisma.ticket.create({
      data: {
        organizationId: orgA.id,
        customerId: custA.id,
        title: 'Alpha Private Ticket',
        description: 'Classified Alpha ticket data',
      },
    });

    docA = await prisma.knowledgeDocument.create({
      data: {
        organizationId: orgA.id,
        title: 'Alpha Proprietary Refund Policy',
        contentType: 'text/plain',
        status: DocumentStatus.READY,
      },
    });

    const chunkAVector = `[${new Array(768).fill(0.01).join(',')}]`;
    const chunkAId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO document_chunks ("id", "documentId", "chunkIndex", "content", "embedding", "createdAt")
      VALUES ('${chunkAId}', '${docA.id}', 0, 'Alpha customers have a 60-day return policy.', '${chunkAVector}'::vector, NOW());
    `);

    // 2. Seed Tenant Beta
    orgB = await prisma.organization.create({
      data: {
        name: `Tenant Beta ${testRunId}`,
        slug: `tenant-beta-${testRunId}`,
      },
    });

    custB = await prisma.customer.create({
      data: {
        name: 'Bob Beta',
        email: `bob.${testRunId}@beta.com`,
        organizationId: orgB.id,
      },
    });

    convB = await prisma.conversation.create({
      data: {
        organizationId: orgB.id,
        customerId: custB.id,
      },
    });

    ticketB = await prisma.ticket.create({
      data: {
        organizationId: orgB.id,
        customerId: custB.id,
        title: 'Beta Confidential Ticket',
        description: 'Classified Beta ticket data',
      },
    });

    docB = await prisma.knowledgeDocument.create({
      data: {
        organizationId: orgB.id,
        title: 'Beta Strict Warranty Guidelines',
        contentType: 'text/plain',
        status: DocumentStatus.READY,
      },
    });

    const chunkBVector = `[${new Array(768).fill(0.01).join(',')}]`;
    const chunkBId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO document_chunks ("id", "documentId", "chunkIndex", "content", "embedding", "createdAt")
      VALUES ('${chunkBId}', '${docB.id}', 0, 'Beta customers have a strict 7-day warranty exchange.', '${chunkBVector}'::vector, NOW());
    `);
  });

  afterAll(async () => {
    // Cascade cleanup using root organizations
    if (orgA?.id || orgB?.id) {
      await prisma.organization.deleteMany({
        where: {
          id: { in: [orgA?.id, orgB?.id].filter(Boolean) },
        },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Relational Tenant Isolation', () => {
    it('Org A user CAN read Org A conversation', async () => {
      const conv = await conversationsService.findOne(convA.id, orgA.id);
      expect(conv).toBeDefined();
      expect(conv.id).toBe(convA.id);
      expect(conv.organizationId).toBe(orgA.id);
    });

    it('Org A user CANNOT read Org B conversation even when knowing Org B UUID (IDOR prevention)', async () => {
      await expect(conversationsService.findOne(convB.id, orgA.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Org B user CANNOT read Org A conversation', async () => {
      await expect(conversationsService.findOne(convA.id, orgB.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Listing conversations for Org A returns ONLY Org A conversations', async () => {
      const listA = await conversationsService.findAll(undefined, undefined, orgA.id);
      const convIds = listA.map((c) => c.id);
      expect(convIds).toContain(convA.id);
      expect(convIds).not.toContain(convB.id);
    });

    it('Org A user CAN read Org A ticket', async () => {
      const ticket = await ticketsService.findOne(ticketA.id, orgA.id);
      expect(ticket).toBeDefined();
      expect(ticket.id).toBe(ticketA.id);
      expect(ticket.organizationId).toBe(orgA.id);
    });

    it('Org A user CANNOT read Org B ticket even when knowing Org B ticket UUID', async () => {
      await expect(ticketsService.findOne(ticketB.id, orgA.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Listing tickets for Org A returns ONLY Org A tickets', async () => {
      const listA = await ticketsService.findAll(undefined, orgA.id);
      const ticketIds = listA.map((t) => t.id);
      expect(ticketIds).toContain(ticketA.id);
      expect(ticketIds).not.toContain(ticketB.id);
    });
  });

  describe('2. RAG Knowledge & Vector Search Tenant Isolation', () => {
    it('Querying knowledge base under Org A returns ONLY Org A document chunks', async () => {
      const searchRes = await searchKnowledgeBaseTool.execute(
        { query: 'policy warranty return' },
        { conversationId: convA.id, customerId: custA.id, organizationId: orgA.id },
      );

      expect(searchRes.results).toBeDefined();
      expect(searchRes.results.length).toBeGreaterThan(0);

      // Verify that every single returned chunk belongs to Org A
      for (const item of searchRes.results) {
        expect(item.documentTitle).toBe(docA.title);
        expect(item.content).toContain('60-day return policy');
        expect(item.documentTitle).not.toBe(docB.title);
      }
    });

    it('Querying knowledge base under Org B returns ONLY Org B document chunks', async () => {
      const searchRes = await searchKnowledgeBaseTool.execute(
        { query: 'policy warranty return' },
        { conversationId: convB.id, customerId: custB.id, organizationId: orgB.id },
      );

      expect(searchRes.results).toBeDefined();
      expect(searchRes.results.length).toBeGreaterThan(0);

      // Verify that every single returned chunk belongs to Org B
      for (const item of searchRes.results) {
        expect(item.documentTitle).toBe(docB.title);
        expect(item.content).toContain('strict 7-day warranty exchange');
        expect(item.documentTitle).not.toBe(docA.title);
      }
    });

    it('Querying knowledge base with missing organizationId returns zero results (no cross-leakage)', async () => {
      const searchRes = await searchKnowledgeBaseTool.execute(
        { query: 'policy warranty return' },
        { conversationId: convA.id, customerId: custA.id, organizationId: undefined },
      );

      expect(searchRes).toEqual({ results: [] });
    });
  });
});
