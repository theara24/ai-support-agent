import { Module, forwardRef } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LLMProviderFactory } from './llm-provider.factory';
import { AiAgentService } from './ai-agent.service';
import { ToolModule } from '../tools/tool.module';

@Module({
  imports: [forwardRef(() => ToolModule)],
  providers: [
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    LLMProviderFactory,
    AiAgentService,
  ],
  exports: [AiAgentService, LLMProviderFactory],
})
export class AiModule {}
