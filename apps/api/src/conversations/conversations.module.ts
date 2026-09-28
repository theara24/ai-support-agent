import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MessagesGateway } from '../messages/messages.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, MessagesGateway],
  exports: [ConversationsService, MessagesGateway],
})
export class ConversationsModule {}
