import { LLMMessage, LLMResponse, LLMToolDefinition } from '@ai-support/types';

export interface LLMProvider {
  readonly providerName: string;

  generateChatCompletion(options: {
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse>;

  generateEmbeddings(text: string): Promise<number[]>;
}
