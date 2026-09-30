import { Injectable, Logger } from '@nestjs/common';
import { LLMProviderFactory } from './llm-provider.factory';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { IntentRouterService } from './intent-router.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_AI_SYSTEM_PROMPT } from '@ai-support/shared';
import { LLMMessage, ConversationStatus, MessageSenderType, IntentCategory } from '@ai-support/types';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private providerFactory: LLMProviderFactory,
    private toolRegistry: ToolRegistryService,
    private intentRouter: IntentRouterService,
    private prisma: PrismaService,
    private messagesGateway: MessagesGateway,
  ) {}

  async processIncomingMessage(
    conversationId: string,
    userMessageContent: string,
    correlationId?: string,
  ): Promise<string> {
    const traceId = correlationId || `trace-${Date.now()}`;
    this.logger.log(`[${traceId}] Processing AI workflow for conversation: ${conversationId}`);

    // 1. Load conversation & history
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        organization: true,
        messages: {
          take: 12,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const orgName = (conversation as any).organization?.name || 'Customer Support';

    // If conversation is already taken over by a human, do not auto-respond
    if (conversation.status === ConversationStatus.HUMAN_ACTIVE) {
      return '';
    }

    // 2. Intent & Capability Routing Layer
    const intent = this.intentRouter.classify(userMessageContent);
    this.logger.log(
      `Classified intent for conv ${conversationId}: ${intent.category} (requiresRag: ${intent.requiresRag}, confidence: ${intent.confidence})`,
    );

    // 3. Perform knowledge search context retrieval (RAG) when required
    let contextAugmentation = '';
    if (intent.requiresRag) {
      try {
        const kbResults = await this.toolRegistry.executeTool(
          'searchKnowledgeBase',
          { query: userMessageContent },
          {
            conversationId,
            customerId: conversation.customerId,
            organizationId: conversation.organizationId || undefined,
          },
        );

        if (kbResults.result?.results?.length > 0) {
          contextAugmentation =
            `\n\nVerified Knowledge Base Excerpts:\n` +
            kbResults.result.results
              .map((r: any) => {
                const chunkLabel =
                  r.chunkIndex !== undefined && r.chunkIndex !== null
                    ? ` (Part ${r.chunkIndex + 1})`
                    : '';
                return `- Source: [${r.documentTitle}${chunkLabel}]\n  Content: ${r.content}`;
              })
              .join('\n\n');
        }
      } catch (e: any) {
        this.logger.warn(`Knowledge base search error during RAG step: ${e.message}`);
      }
    }

    // 4. Assemble chat message history for LLM
    const baseSystemPrompt = process.env.AI_SYSTEM_PROMPT?.trim() || DEFAULT_AI_SYSTEM_PROMPT;
    const systemPrompt = baseSystemPrompt + contextAugmentation;
    const historyMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages
        .filter((m) => !m.isInternalNote)
        .map((m) => ({
          role: (m.senderType === MessageSenderType.CUSTOMER ? 'user' : 'assistant') as any,
          content: m.content,
        })),
      { role: 'user', content: userMessageContent },
    ];

    // 5. Invoke LLM Provider
    const provider = this.providerFactory.getProvider();
    const tools = this.toolRegistry.getToolDefinitions();

    const llmStart = Date.now();
    let llmResponse = await provider.generateChatCompletion({
      messages: historyMessages,
      tools,
      temperature: 0.2,
    });
    const llmDurationMs = Date.now() - llmStart;

    let finalResponseText = llmResponse.content || '';
    let totalPromptTokens = llmResponse.tokenUsage?.promptTokens || 0;
    let totalCompletionTokens = llmResponse.tokenUsage?.completionTokens || 0;

    this.logger.log(
      `[${traceId}] [LLM Primary] duration: ${llmDurationMs}ms | promptTokens: ${totalPromptTokens} | completionTokens: ${totalCompletionTokens} | totalTokens: ${totalPromptTokens + totalCompletionTokens} | toolsSelected: ${llmResponse.toolCalls?.length || 0}`,
    );

    // 6. Handle Tool Calls & Synthesize Grounded User Responses
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const toolCall of llmResponse.toolCalls) {
        this.logger.log(`AI selected tool: ${toolCall.name} with params: ${JSON.stringify(toolCall.arguments)}`);
        const executed = await this.toolRegistry.executeTool(
          toolCall.name,
          toolCall.arguments,
          {
            conversationId,
            customerId: conversation.customerId,
            organizationId: conversation.organizationId || undefined,
          },
        );

        if (toolCall.name === 'escalateToHuman') {
          finalResponseText =
            'I have escalated your request to a live support agent who will join this conversation shortly. Please hold on.';
          this.messagesGateway.emitStatusChange(conversationId, ConversationStatus.WAITING_FOR_AGENT);
        } else if (toolCall.name === 'createSupportTicket') {
          const tId = executed.result?.ticketId ? `#${executed.result.ticketId.slice(0, 8)}` : '';
          finalResponseText = `I have logged official support ticket ${tId} for your request ("${toolCall.arguments?.title || 'Support Request'}"). Our support team will review it and assist you.`;
        } else if (toolCall.name === 'getCurrentTime') {
          try {
            const synthesisInstruction = `
You are a helpful and polite enterprise AI assistant for ${orgName}.
Customer question: "${userMessageContent}"
Tool executed: getCurrentTime
Tool result:
${JSON.stringify(executed.result, null, 2)}
${contextAugmentation ? `\nVerified Knowledge Base Excerpts:\n${contextAugmentation}` : ''}

Instructions:
- Provide a clear, polite, and direct response to the customer stating the current time, date, and timezone based strictly on the tool result.
- Language Policy (STRICT): If the customer question is in Khmer (ភាសាខ្មែរ), reply ONLY in natural, polite Khmer. NEVER output or mix Thai script, Thai characters, or Thai words (such as สวัสดี, ครับ, ค่ะ, มี, ฯลฯ). Thai is strictly forbidden. If in English, reply in English.`;

            const synthRes = await provider.generateChatCompletion({
              messages: [{ role: 'user', content: synthesisInstruction }],
              temperature: 0.1,
            });

            if (synthRes.content) {
              finalResponseText = synthRes.content;
              if (synthRes.tokenUsage) {
                totalPromptTokens += synthRes.tokenUsage.promptTokens;
                totalCompletionTokens += synthRes.tokenUsage.completionTokens;
              }
            } else {
              finalResponseText = `It's ${executed.result?.time || executed.result?.readable} in ${executed.result?.timezone || 'Phnom Penh'}.`;
            }
          } catch (synthErr: any) {
            this.logger.warn(`Failed synthesis for getCurrentTime: ${synthErr.message}`);
            finalResponseText = `The current time is ${executed.result?.time || executed.result?.readable} (${executed.result?.timezone || 'Asia/Phnom_Penh'}).`;
          }
        } else if (
          toolCall.name === 'getOrderStatus' ||
          toolCall.name === 'getCustomerProfile' ||
          toolCall.name === 'searchKnowledgeBase'
        ) {
          // Synthesize a natural grounded answer using the tool result
          try {
            const synthesisInstruction = `
You are a helpful and polite enterprise AI assistant for ${orgName}.
Customer question: "${userMessageContent}"
Tool executed: ${toolCall.name}
Tool result:
${JSON.stringify(executed.result, null, 2)}
${contextAugmentation ? `\nVerified Knowledge Base Excerpts:\n${contextAugmentation}` : ''}

Instructions:
- Provide a clear, polite, and helpful response directly to the customer answering their question based strictly on the tool result and any verified knowledge excerpts.
- When answering using verified knowledge excerpts, always cite the source document name.
- Language Policy (STRICT): If the customer question is in Khmer (ភាសាខ្មែរ), reply ONLY in natural, polite Khmer. NEVER output or mix Thai script, Thai characters, or Thai words (such as สวัสดี, ครับ, ค่ะ, มี, ฯลฯ). Thai is strictly forbidden. If in English, reply in English.`;

            const synthStart = Date.now();
            const synthRes = await provider.generateChatCompletion({
              messages: [{ role: 'user', content: synthesisInstruction }],
              temperature: 0.2,
            });
            const synthDurationMs = Date.now() - synthStart;

            if (synthRes.content) {
              finalResponseText = synthRes.content;
              if (synthRes.tokenUsage) {
                totalPromptTokens += synthRes.tokenUsage.promptTokens;
                totalCompletionTokens += synthRes.tokenUsage.completionTokens;
              }
              this.logger.log(
                `[${traceId}] [LLM Tool Synthesis: ${toolCall.name}] duration: ${synthDurationMs}ms | promptTokens: ${synthRes.tokenUsage?.promptTokens || 0} | completionTokens: ${synthRes.tokenUsage?.completionTokens || 0}`,
              );
            }
          } catch (synthErr: any) {
            this.logger.warn(`Failed synthesis for ${toolCall.name}: ${synthErr.message}`);
            if (toolCall.name === 'getOrderStatus' && executed.result) {
              if (executed.result.found === false || executed.result.error) {
                finalResponseText = `I could not find order "${toolCall.arguments?.orderId || executed.result.orderId}". Please verify your order number and try again.`;
              } else {
                finalResponseText = `Your order ${executed.result.orderId} status is ${executed.result.status}. Carrier: ${executed.result.carrier}, Tracking number: ${executed.result.trackingNumber}. Estimated delivery: ${executed.result.estimatedDelivery}.`;
              }
            }
          }
        }
      }
    }

    // Strict guardrail: Purge any accidental Thai characters (Unicode range U+0E00 to U+0E7F)
    finalResponseText = finalResponseText.replace(/[\u0E00-\u0E7F]+/g, '').replace(/\s{2,}/g, ' ').trim();

    // 7. Direct user intent fallback: check if user explicitly requested human agent
    const lowerText = userMessageContent.toLowerCase();
    const explicitHumanRequest =
      (intent.category === IntentCategory.HUMAN_HANDOFF ||
        lowerText.includes('human') ||
        lowerText.includes('real person') ||
        lowerText.includes('speak to agent') ||
        lowerText.includes('talk to someone') ||
        lowerText.includes('representative')) &&
      conversation.status !== ConversationStatus.WAITING_FOR_AGENT;

    if (explicitHumanRequest && !finalResponseText.includes('escalated')) {
      await this.toolRegistry.executeTool(
        'escalateToHuman',
        { reason: 'Customer explicitly requested a human representative' },
        {
          conversationId,
          customerId: conversation.customerId,
          organizationId: conversation.organizationId || undefined,
        },
      );
      finalResponseText =
        'I have escalated your request to a live support agent who will join this conversation shortly. Please hold on.';
      this.messagesGateway.emitStatusChange(conversationId, ConversationStatus.WAITING_FOR_AGENT);
    }

    // If finalResponseText is still empty, provide safe fallback
    if (!finalResponseText.trim()) {
      finalResponseText =
        'Thank you for reaching out. How else can I assist you today? You can ask general questions, check orders, inquire about policies, or request human support.';
    }

    // Re-fetch conversation to check for race condition with human agent takeover during LLM generation
    const freshConversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { status: true },
    });

    if (
      !freshConversation ||
      freshConversation.status === ConversationStatus.HUMAN_ACTIVE ||
      (freshConversation.status !== ConversationStatus.AI_ACTIVE &&
        freshConversation.status !== ConversationStatus.WAITING_FOR_AGENT)
    ) {
      this.logger.warn(
        `Race condition detected: Conversation ${conversationId} status transitioned to ${freshConversation?.status || 'NOT_FOUND'} during AI generation (human agent takeover). Discarding AI response.`,
      );
      return '';
    }

    const totalTokens = totalPromptTokens + totalCompletionTokens;

    // 8. Record AI usage metrics
    try {
      await this.prisma.aIUsage.create({
        data: {
          conversationId,
          provider: provider.providerName,
          model: provider.modelName || 'gemini-flash-lite-latest',
          promptTokens: totalPromptTokens || 20,
          completionTokens: totalCompletionTokens || 20,
          totalTokens: totalTokens || 40,
          costEstimate: ((totalTokens || 40) / 1000) * 0.0001,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not save AIUsage: ${e.message}`);
    }

    // 9. Store AI Message in Database
    const aiMessage = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: MessageSenderType.AI,
        content: finalResponseText,
        aiMetadata: {
          provider: provider.providerName,
          intent: intent.category,
          tokenUsage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens,
          },
        },
      },
    });

    // 10. Real-Time Socket.IO Broadcast to conversation room and dashboard
    this.messagesGateway.emitNewMessage(conversationId, aiMessage);

    return finalResponseText;
  }
}
