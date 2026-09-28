import { Injectable, Logger } from '@nestjs/common';
import { LLMProviderFactory } from './llm-provider.factory';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_AI_SYSTEM_PROMPT } from '@ai-support/shared';
import { LLMMessage, ConversationStatus, MessageSenderType } from '@ai-support/types';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private providerFactory: LLMProviderFactory,
    private toolRegistry: ToolRegistryService,
    private prisma: PrismaService,
  ) {}

  async processIncomingMessage(conversationId: string, userMessageContent: string): Promise<string> {
    this.logger.log(`Processing AI workflow for conversation: ${conversationId}`);

    // 1. Load conversation & history
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        messages: {
          take: 10,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // If conversation is already taken over by a human, do not auto-respond
    if (conversation.status === ConversationStatus.HUMAN_ACTIVE) {
      return '';
    }

    // 2. Perform knowledge search context retrieval
    const kbResults = await this.toolRegistry.executeTool(
      'searchKnowledgeBase',
      { query: userMessageContent },
      {
        conversationId,
        customerId: conversation.customerId,
        organizationId: conversation.organizationId || undefined,
      },
    );

    let contextAugmentation = '';
    if (kbResults.result?.results?.length > 0) {
      contextAugmentation = `\n\nVerified Knowledge Base Excerpts:\n` +
        kbResults.result.results.map((r: any) => `- [${r.documentTitle}]: ${r.content}`).join('\n');
    }

    // 3. Assemble chat message history for LLM
    const systemPrompt = DEFAULT_AI_SYSTEM_PROMPT + contextAugmentation;
    const historyMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.map((m) => ({
        role: (m.senderType === MessageSenderType.CUSTOMER ? 'user' : 'assistant') as any,
        content: m.content,
      })),
      { role: 'user', content: userMessageContent },
    ];

    // 4. Invoke LLM Provider
    const provider = this.providerFactory.getProvider();
    const tools = this.toolRegistry.getToolDefinitions();

    const llmResponse = await provider.generateChatCompletion({
      messages: historyMessages,
      tools,
      temperature: 0.3,
    });

    let finalResponseText = llmResponse.content;

    // 5. Handle Tool Call / Intent execution if LLM requested tool execution
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const toolCall of llmResponse.toolCalls) {
        const executed = await this.toolRegistry.executeTool(
          toolCall.name,
          toolCall.arguments,
          {
            conversationId,
            customerId: conversation.customerId,
            organizationId: conversation.organizationId || undefined,
          },
        );
        this.logger.log(`Tool ${toolCall.name} execution result: ${JSON.stringify(executed.result)}`);
      }
    }

    // Fallback confidence check: if AI response expresses inability, offer human handoff
    const lowConfidencePhrases = [
      'not able to confirm',
      'do not have that information',
      'cannot answer',
      'unable to verify',
    ];
    const isLowConfidence = lowConfidencePhrases.some((phrase) =>
      finalResponseText.toLowerCase().includes(phrase),
    );

    if (isLowConfidence) {
      await this.toolRegistry.executeTool(
        'escalateToHuman',
        { reason: 'AI low confidence response' },
        {
          conversationId,
          customerId: conversation.customerId,
          organizationId: conversation.organizationId || undefined,
        },
      );
      finalResponseText += '\n\n(I have escalated your request to a live support agent who will join shortly.)';
    }

    // 6. Record AI usage metrics
    if (llmResponse.tokenUsage) {
      await this.prisma.aIUsage.create({
        data: {
          conversationId,
          provider: provider.providerName,
          model: 'gemini-1.5-flash',
          promptTokens: llmResponse.tokenUsage.promptTokens,
          completionTokens: llmResponse.tokenUsage.completionTokens,
          totalTokens: llmResponse.tokenUsage.totalTokens,
          costEstimate: (llmResponse.tokenUsage.totalTokens / 1000) * 0.0001,
        },
      });
    }

    // 7. Store AI Message in Database
    await this.prisma.message.create({
      data: {
        conversationId,
        senderType: MessageSenderType.AI,
        content: finalResponseText,
        aiMetadata: {
          provider: provider.providerName,
          tokenUsage: llmResponse.tokenUsage,
        },
      },
    });

    return finalResponseText;
  }
}
