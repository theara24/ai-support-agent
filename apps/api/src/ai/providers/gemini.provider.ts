import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../llm-provider.interface';
import { LLMMessage, LLMResponse, LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class GeminiProvider implements LLMProvider {
  readonly providerName = 'gemini';
  readonly modelName: string;
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock_key';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-flash-latest';
    this.logger.log(
      `[DIAGNOSTIC] Initialized GeminiProvider - Model: ${this.modelName}, AI_PROVIDER: ${this.configService.get('AI_PROVIDER')}, API key configured: ${Boolean(this.configService.get('GEMINI_API_KEY'))}`,
    );
  }

  async generateChatCompletion(options: {
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    this.logger.log(`[DIAGNOSTIC] Safe Pre-Request Diagnostic:`);
    this.logger.log(`LLM Provider: Gemini`);
    this.logger.log(`Configured model: ${this.modelName}`);
    this.logger.log(`AI_PROVIDER: ${this.configService.get('AI_PROVIDER')}`);
    this.logger.log(`API key configured: ${Boolean(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== 'mock_key')}`);

    // Fallback if API key is not configured or in test mode
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'mock_key') {
      this.logger.warn('GEMINI_API_KEY is missing or unconfigured. Returning mock response.');
      return {
        content: "I am your AI Support Assistant. (Mock Gemini response - please set GEMINI_API_KEY in .env)",
        tokenUsage: { promptTokens: 15, completionTokens: 20, totalTokens: 35 },
      };
    }

    try {
      const toolsParam = options.tools && options.tools.length > 0 ? [{
        functionDeclarations: options.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters as any,
        })),
      }] : undefined;

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        tools: toolsParam,
      });

      // Build system prompt and prompt string
      const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';
      const chatHistory = options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = systemMsg ? `${systemMsg}\n\n${chatHistory}` : chatHistory;

      let result: any;
      let lastError: any;
      const maxRetries = 3;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          result = await model.generateContent(fullPrompt);
          break;
        } catch (err: any) {
          lastError = err;
          const isTransient =
            err.status === 503 ||
            err.status === 429 ||
            String(err.message).includes('503') ||
            String(err.message).includes('429') ||
            String(err.message).includes('fetch failed') ||
            String(err.message).includes('ECONNRESET') ||
            String(err.message).includes('ETIMEDOUT') ||
            String(err.message).includes('ENOTFOUND');

          if (isTransient && attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 500;
            this.logger.warn(
              `[RETRY] Transient Gemini API error (${err.status || err.message}). Retrying attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else {
            throw err;
          }
        }
      }
      const functionCalls = result.response.functionCalls();
      let responseText = '';
      try {
        responseText = result.response.text();
      } catch (e) {
        // text() can throw if response only contains function calls
        responseText = '';
      }

      const toolCalls = functionCalls && functionCalls.length > 0 ? functionCalls.map((fc) => ({
        id: (fc as any).id || `call_${Math.random().toString(36).slice(2, 8)}`,
        name: fc.name,
        arguments: fc.args,
      })) : undefined;

      return {
        content: responseText || (toolCalls ? `[Invoking tool: ${toolCalls[0].name}]` : ''),
        toolCalls,
        tokenUsage: {
          promptTokens: Math.ceil(fullPrompt.length / 4),
          completionTokens: Math.ceil((responseText || '').length / 4),
          totalTokens: Math.ceil((fullPrompt.length + (responseText || '').length) / 4),
        },
      };
    } catch (error) {
      this.logger.error('Error generating Gemini response', error);
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'mock_key') {
      // Deterministic pseudo-embedding of dimension 768 for local dev/test without API key
      return new Array(768).fill(0).map((_, i) => Math.sin(text.length + i) * 0.1);
    }

    try {
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768,
      } as any);
      return result.embedding.values;
    } catch (error) {
      this.logger.error('Error generating Gemini embedding', error);
      // Fallback deterministic vector
      return new Array(768).fill(0).map((_, i) => Math.sin(text.length + i) * 0.1);
    }
  }
}
