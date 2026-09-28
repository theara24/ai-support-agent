import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from '../llm-provider.interface';
import { LLMMessage, LLMResponse, LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  readonly providerName = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private configService: ConfigService) {}

  async generateChatCompletion(options: {
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      this.logger.warn('OPENAI_API_KEY is unconfigured. Returning fallback response.');
      return {
        content: 'OpenAI provider requested (Set OPENAI_API_KEY in .env).',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      };
    }

    // Standard HTTP fetch call to OpenAI API to avoid heavy dependencies if needed
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return {
        content,
        tokenUsage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed calling OpenAI API', error);
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    return new Array(768).fill(0).map((_, i) => Math.cos(text.length + i) * 0.1);
  }
}
