import { LLMToolDefinition } from '@ai-support/types';

export interface ToolExecutionContext {
  conversationId: string;
  customerId: string;
  organizationId?: string;
}

export interface IAgentTool {
  readonly definition: LLMToolDefinition;
  execute(params: Record<string, any>, context: ToolExecutionContext): Promise<any>;
}
