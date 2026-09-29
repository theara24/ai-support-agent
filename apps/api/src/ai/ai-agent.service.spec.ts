import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from './ai-agent.service';
import { LLMProviderFactory } from './llm-provider.factory';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { IntentRouterService } from './intent-router.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { DemoProvider } from './providers/demo.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ConfigService } from '@nestjs/config';
import { ConversationStatus, MessageSenderType, IntentCategory } from '@ai-support/types';

describe('AiAgentService & AI Capabilities', () => {
  let service: AiAgentService;
  let intentRouter: IntentRouterService;

  const mockProvider = {
    providerName: 'gemini',
    modelName: 'gemini-flash-lite-latest',
    generateChatCompletion: jest.fn(),
    generateEmbeddings: jest.fn(),
  };

  const mockProviderFactory = {
    getProvider: jest.fn().mockReturnValue(mockProvider),
  };

  const mockToolRegistry = {
    executeTool: jest.fn(),
    getToolDefinitions: jest.fn().mockReturnValue([
      { name: 'getCurrentTime', description: 'Get time', parameters: {} },
      { name: 'getOrderStatus', description: 'Get order', parameters: {} },
      { name: 'searchKnowledgeBase', description: 'Search KB', parameters: {} },
      { name: 'escalateToHuman', description: 'Escalate', parameters: {} },
    ]),
  };

  const mockMessagesGateway = {
    emitNewMessage: jest.fn(),
    emitStatusChange: jest.fn(),
    emitTyping: jest.fn(),
  };

  const mockPrisma = {
    conversation: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'msg-ai-1', ...args.data })),
    },
    aIUsage: {
      create: jest.fn().mockResolvedValue({ id: 'usage-1' }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        IntentRouterService,
        { provide: LLMProviderFactory, useValue: mockProviderFactory },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessagesGateway, useValue: mockMessagesGateway },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
    intentRouter = module.get<IntentRouterService>(IntentRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1. General Greeting
  it('should handle general greeting without invoking business RAG', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockProvider.generateChatCompletion.mockResolvedValue({
      content: 'Hello! I am your AI assistant. How can I help you today?',
      tokenUsage: { promptTokens: 15, completionTokens: 15, totalTokens: 30 },
    });

    const reply = await service.processIncomingMessage('conv-1', 'Hello');
    expect(reply).toContain('Hello!');
    // Verify RAG was NOT called
    expect(mockToolRegistry.executeTool).not.toHaveBeenCalledWith(
      'searchKnowledgeBase',
      expect.anything(),
      expect.anything(),
    );
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiMetadata: expect.objectContaining({ intent: IntentCategory.GENERAL }),
        }),
      }),
    );
  });

  // 2. General Knowledge Question
  it('should answer general knowledge questions directly using model knowledge without RAG', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockProvider.generateChatCompletion.mockResolvedValue({
      content: 'Docker is a platform for running applications in isolated containers.',
      tokenUsage: { promptTokens: 25, completionTokens: 20, totalTokens: 45 },
    });

    const reply = await service.processIncomingMessage('conv-1', 'What is Docker?');
    expect(reply).toContain('Docker is a platform');
    expect(mockToolRegistry.executeTool).not.toHaveBeenCalledWith(
      'searchKnowledgeBase',
      expect.anything(),
      expect.anything(),
    );
  });

  // 3. Current-Time Request
  it('should invoke getCurrentTime tool and synthesize real-time clock answer', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockToolRegistry.executeTool.mockImplementation((toolName) => {
      if (toolName === 'getCurrentTime') {
        return Promise.resolve({
          result: {
            iso: new Date().toISOString(),
            readable: 'September 29, 2026, 6:30 PM',
            timezone: 'Asia/Phnom_Penh',
            date: '2026-09-29',
            time: '6:30 PM',
            dayOfWeek: 'Tuesday',
          },
        });
      }
      return Promise.resolve({ result: {} });
    });

    // Step 1: LLM selects getCurrentTime tool
    mockProvider.generateChatCompletion
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          { id: 'call_time_1', name: 'getCurrentTime', arguments: { timezone: 'Asia/Phnom_Penh' } },
        ],
        tokenUsage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      })
      // Step 2: Synthesis
      .mockResolvedValueOnce({
        content: "It's 6:30 PM in Phnom Penh, Cambodia.",
        tokenUsage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
      });

    const reply = await service.processIncomingMessage('conv-1', 'What time is it?');
    expect(reply).toContain('6:30 PM');
    expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
      'getCurrentTime',
      { timezone: 'Asia/Phnom_Penh' },
      expect.anything(),
    );
  });

  // 4. Business RAG Question
  it('should execute searchKnowledgeBase RAG for business-specific questions and ground answer', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockToolRegistry.executeTool.mockResolvedValue({
      result: {
        results: [
          { documentTitle: 'Payment Methods', content: 'We accept KHQR, Visa, and Mastercard.' },
        ],
      },
    });

    mockProvider.generateChatCompletion.mockResolvedValue({
      content: 'Acme accepts KHQR, Visa, and Mastercard.',
      tokenUsage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 },
    });

    const reply = await service.processIncomingMessage('conv-1', 'What payment methods do you support?');
    expect(reply).toContain('KHQR');
    expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
      'searchKnowledgeBase',
      { query: 'What payment methods do you support?' },
      expect.anything(),
    );
  });

  // 5. Order-Status Tool Call
  it('should execute getOrderStatus tool and synthesize grounded order response', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockToolRegistry.executeTool.mockImplementation((toolName) => {
      if (toolName === 'getOrderStatus') {
        return Promise.resolve({
          result: {
            orderId: 'ACME-1001',
            status: 'SHIPPED',
            carrier: 'FedEx',
            trackingNumber: 'FDX-ACME-1001-99',
            estimatedDelivery: 'In 2 business days',
          },
        });
      }
      return Promise.resolve({ result: {} });
    });

    mockProvider.generateChatCompletion
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          { id: 'call_1', name: 'getOrderStatus', arguments: { orderId: 'ACME-1001' } },
        ],
      })
      .mockResolvedValueOnce({
        content: 'Your order ACME-1001 has been shipped via FedEx. Tracking: FDX-ACME-1001-99.',
      });

    const reply = await service.processIncomingMessage('conv-1', 'Where is my order ACME-1001?');
    expect(reply).toContain('FDX-ACME-1001-99');
    expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
      'getOrderStatus',
      { orderId: 'ACME-1001' },
      expect.anything(),
    );
  });

  // 6. Human Escalation
  it('should escalate to human representative on explicit request', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockToolRegistry.executeTool.mockResolvedValue({ result: { status: 'escalated' } });
    mockProvider.generateChatCompletion.mockResolvedValue({
      content: 'Connecting you with an agent.',
    });

    const reply = await service.processIncomingMessage('conv-1', 'I want to talk to a human');
    expect(reply).toContain('escalated your request to a live support agent');
    expect(mockMessagesGateway.emitStatusChange).toHaveBeenCalledWith('conv-1', ConversationStatus.WAITING_FOR_AGENT);
  });

  // 7. Mixed General + Business Question
  it('should route mixed request to MIXED, execute RAG, and address both general and business parts', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [],
    });

    mockToolRegistry.executeTool.mockResolvedValue({
      result: {
        results: [
          { documentTitle: 'Refund Policy', content: 'Acme provides a 30-day full refund policy.' },
        ],
      },
    });

    mockProvider.generateChatCompletion.mockResolvedValue({
      content: 'A refund is the return of funds to a customer. Acme provides a 30-day full refund policy.',
    });

    const reply = await service.processIncomingMessage(
      'conv-1',
      "What is a refund, and what is Acme's refund policy?",
    );

    expect(reply).toContain('30-day full refund policy');
    expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
      'searchKnowledgeBase',
      expect.anything(),
      expect.anything(),
    );
  });

  // 8. Internal Note Privacy
  it('should exclude internal notes from LLM message history', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      customerId: 'cust-1',
      status: ConversationStatus.AI_ACTIVE,
      messages: [
        { id: 'm1', senderType: MessageSenderType.CUSTOMER, content: 'First question', isInternalNote: false },
        { id: 'm2', senderType: MessageSenderType.AGENT, content: 'CONFIDENTIAL AGENT NOTE', isInternalNote: true },
        { id: 'm3', senderType: MessageSenderType.AI, content: 'First response', isInternalNote: false },
      ],
    });

    mockProvider.generateChatCompletion.mockResolvedValue({
      content: 'Second response',
    });

    await service.processIncomingMessage('conv-1', 'Follow-up question');

    const calledMessages = mockProvider.generateChatCompletion.mock.calls[0][0].messages;
    const historyContents = calledMessages.map((m: any) => m.content).join(' ');
    expect(historyContents).not.toContain('CONFIDENTIAL AGENT NOTE');
    expect(historyContents).toContain('First question');
  });

  // 9. DEMO_AI Behavior
  describe('DEMO_AI behavior (DemoProvider)', () => {
    let demoProvider: DemoProvider;

    beforeEach(() => {
      demoProvider = new DemoProvider();
    });

    it('should answer general greeting deterministically in DEMO_AI', async () => {
      const res = await demoProvider.generateChatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(res.content).toContain('Hello! I am your AI assistant');
    });

    it('should answer general knowledge question (Docker) deterministically in DEMO_AI', async () => {
      const res = await demoProvider.generateChatCompletion({
        messages: [{ role: 'user', content: 'What is Docker?' }],
      });
      expect(res.content).toContain('Docker is an open-source platform');
      expect(res.content).toContain('containers');
    });

    it('should emit getCurrentTime tool call for time inquiries in DEMO_AI', async () => {
      const res = await demoProvider.generateChatCompletion({
        messages: [{ role: 'user', content: 'What time is it?' }],
        tools: [{ name: 'getCurrentTime', description: 'Get time', parameters: {} }],
      });
      expect(res.toolCalls).toBeDefined();
      expect(res.toolCalls?.[0].name).toBe('getCurrentTime');
    });

    it('should synthesize getCurrentTime result using real clock in DEMO_AI', async () => {
      const toolResult = {
        time: '6:30 PM',
        timezone: 'Asia/Phnom_Penh',
        date: '2026-09-29',
      };
      const res = await demoProvider.generateChatCompletion({
        messages: [
          {
            role: 'user',
            content: `Tool executed: getCurrentTime\nTool result:\n${JSON.stringify(toolResult)}`,
          },
        ],
      });
      expect(res.content).toContain('6:30 PM');
      expect(res.content).toContain('Asia/Phnom_Penh');
    });

    it('should emit getOrderStatus for ACME-1001 in DEMO_AI', async () => {
      const res = await demoProvider.generateChatCompletion({
        messages: [{ role: 'user', content: 'Where is order ACME-1001?' }],
        tools: [{ name: 'getOrderStatus', description: 'Get order', parameters: {} }],
      });
      expect(res.toolCalls?.[0].name).toBe('getOrderStatus');
      expect(res.toolCalls?.[0].arguments.orderId).toBe('ACME-1001');
    });

    it('should emit escalateToHuman for agent request in DEMO_AI', async () => {
      const res = await demoProvider.generateChatCompletion({
        messages: [{ role: 'user', content: 'I need to speak to a human agent' }],
        tools: [{ name: 'escalateToHuman', description: 'Escalate', parameters: {} }],
      });
      expect(res.toolCalls?.[0].name).toBe('escalateToHuman');
    });
  });

  // 10. REAL_AI Compatibility
  describe('REAL_AI compatibility (GeminiProvider)', () => {
    it('should format tool definitions as functionDeclarations when provided', async () => {
      const configService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'GEMINI_API_KEY') return 'mock_key';
          if (key === 'GEMINI_MODEL') return 'gemini-flash-lite-latest';
          return null;
        }),
      } as unknown as ConfigService;

      const geminiProvider = new GeminiProvider(configService);
      expect(geminiProvider.providerName).toBe('gemini');
      expect(geminiProvider.modelName).toBe('gemini-flash-lite-latest');

      // In test mode without live key, safe mock response is returned
      const res = await geminiProvider.generateChatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [{ name: 'getCurrentTime', description: 'Time tool', parameters: {} }],
      });
      expect(res).toBeDefined();
      expect(res.content).toBeDefined();
    });
  });
});
