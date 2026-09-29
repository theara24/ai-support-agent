import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from './llm-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DemoProvider } from './providers/demo.provider';

@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);

  constructor(
    private configService: ConfigService,
    private geminiProvider: GeminiProvider,
    private openAIProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
    private demoProvider: DemoProvider,
  ) {}

  getProvider(overrideProvider?: string): LLMProvider {
    const aiMode = this.configService.get<string>('AI_MODE');
    if (aiMode === 'DEMO_AI') {
      return this.demoProvider;
    }

    const selected = (
      overrideProvider ||
      this.configService.get<string>('AI_PROVIDER') ||
      'gemini'
    ).toLowerCase();

    switch (selected) {
      case 'demo':
        return this.demoProvider;
      case 'openai':
        return this.openAIProvider;
      case 'anthropic':
        return this.anthropicProvider;
      case 'gemini':
      default:
        return this.geminiProvider;
    }
  }
}
