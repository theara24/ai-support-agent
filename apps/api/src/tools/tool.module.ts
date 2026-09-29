import { Module, forwardRef } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { SearchKnowledgeBaseTool } from './implementations/search-knowledge-base.tool';
import { EscalateToHumanTool } from './implementations/escalate-to-human.tool';
import { CreateSupportTicketTool } from './implementations/create-support-ticket.tool';
import { GetCustomerProfileTool } from './implementations/get-customer-profile.tool';
import { GetOrderStatusTool } from './implementations/get-order-status.tool';
import { GetCurrentTimeTool } from './implementations/get-current-time.tool';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => AiModule)],
  providers: [
    ToolRegistryService,
    SearchKnowledgeBaseTool,
    EscalateToHumanTool,
    CreateSupportTicketTool,
    GetCustomerProfileTool,
    GetOrderStatusTool,
    GetCurrentTimeTool,
  ],
  exports: [ToolRegistryService],
})
export class ToolModule {}
