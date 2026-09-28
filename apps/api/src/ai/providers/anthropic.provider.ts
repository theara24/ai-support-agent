import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from '../llm-provider.interface';
import { LLMMessage, LLMResponse, LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class AnthropicProvider implements LLMProvider {
  readonly providerName = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private configService: ConfigService) {}

  async generateChatCompletion(options: {
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      this.logger.warn('ANTHROPIC_API_KEY is unconfigured. Returning fallback response.');
      return {
        content: 'Anthropic provider requested (Set ANTHROPIC_API_KEY in .env).',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      };
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: options.maxTokens ?? 1024,
          messages: options.messages.filter((m) => m.role !== 'system'),
          system: options.messages.find((m) => m.role === 'system')?.content,
        }),
      });

      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      return {
        content,
        tokenUsage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      this.logger.error('Failed calling Anthropic API', error);
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    return new Array(768).fill(0).map((_, i) => Math.tan(text.length + i) * 0.1);
  }
}
