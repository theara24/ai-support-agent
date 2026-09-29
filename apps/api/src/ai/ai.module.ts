import { Module, forwardRef } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DemoProvider } from './providers/demo.provider';
import { LLMProviderFactory } from './llm-provider.factory';
import { AiAgentService } from './ai-agent.service';
import { IntentRouterService } from './intent-router.service';
import { ToolModule } from '../tools/tool.module';

@Module({
  imports: [forwardRef(() => ToolModule)],
  providers: [
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    DemoProvider,
    LLMProviderFactory,
    AiAgentService,
    IntentRouterService,
  ],
  exports: [AiAgentService, LLMProviderFactory, IntentRouterService],
})
export class AiModule {}
