import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../llm-provider.interface';
import { LLMMessage, LLMResponse, LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class GeminiProvider implements LLMProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock_key';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = 'gemini-1.5-flash';
  }

  async generateChatCompletion(options: {
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    // Fallback if API key is not configured or in test mode
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'mock_key') {
      this.logger.warn('GEMINI_API_KEY is missing or unconfigured. Returning mock response.');
      return {
        content: "I am your AI Support Assistant. (Mock Gemini response - please set GEMINI_API_KEY in .env)",
        tokenUsage: { promptTokens: 15, completionTokens: 20, totalTokens: 35 },
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      // Build system prompt and prompt string
      const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';
      const chatHistory = options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = systemMsg ? `${systemMsg}\n\n${chatHistory}` : chatHistory;

      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();

      return {
        content: responseText,
        tokenUsage: {
          promptTokens: Math.ceil(fullPrompt.length / 4),
          completionTokens: Math.ceil(responseText.length / 4),
          totalTokens: Math.ceil((fullPrompt.length + responseText.length) / 4),
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
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      this.logger.error('Error generating Gemini embedding', error);
      // Fallback deterministic vector
      return new Array(768).fill(0).map((_, i) => Math.sin(text.length + i) * 0.1);
    }
  }
}
