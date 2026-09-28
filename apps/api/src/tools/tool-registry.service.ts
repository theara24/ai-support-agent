import { Injectable, Logger } from '@nestjs/common';
import { IAgentTool, ToolExecutionContext } from './tool.interface';
import { SearchKnowledgeBaseTool } from './implementations/search-knowledge-base.tool';
import { EscalateToHumanTool } from './implementations/escalate-to-human.tool';
import { CreateSupportTicketTool } from './implementations/create-support-ticket.tool';
import { GetCustomerProfileTool } from './implementations/get-customer-profile.tool';
import { GetOrderStatusTool } from './implementations/get-order-status.tool';
import { LLMToolDefinition } from '@ai-support/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private tools = new Map<string, IAgentTool>();

  constructor(
    private searchKnowledgeBaseTool: SearchKnowledgeBaseTool,
    private escalateToHumanTool: EscalateToHumanTool,
    private createSupportTicketTool: CreateSupportTicketTool,
    private getCustomerProfileTool: GetCustomerProfileTool,
    private getOrderStatusTool: GetOrderStatusTool,
    private prisma: PrismaService,
  ) {
    this.registerTool(searchKnowledgeBaseTool);
    this.registerTool(escalateToHumanTool);
    this.registerTool(createSupportTicketTool);
    this.registerTool(getCustomerProfileTool);
    this.registerTool(getOrderStatusTool);
  }

  registerTool(tool: IAgentTool) {
    this.tools.set(tool.definition.name, tool);
  }

  getToolDefinitions(): LLMToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async executeTool(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext,
  ): Promise<{ result: any; executionMs: number; isError: boolean }> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        result: { error: `Tool ${name} is not registered` },
        executionMs: 0,
        isError: true,
      };
    }

    const startTime = Date.now();
    try {
      this.logger.log(`Executing AI Tool: ${name} with args: ${JSON.stringify(args)}`);
      const result = await tool.execute(args, context);
      const executionMs = Date.now() - startTime;

      // Log tool call execution in database
      await this.prisma.toolCall.create({
        data: {
          toolName: name,
          inputParams: args,
          outputResult: result,
          executionMs,
          isError: false,
        },
      });

      return { result, executionMs, isError: false };
    } catch (err: any) {
      const executionMs = Date.now() - startTime;
      this.logger.error(`Error executing tool ${name}`, err);

      await this.prisma.toolCall.create({
        data: {
          toolName: name,
          inputParams: args,
          outputResult: { error: err.message },
          executionMs,
          isError: true,
        },
      });

      return {
        result: { error: err.message || 'Tool execution failed' },
        executionMs,
        isError: true,
      };
    }
  }
}
