import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { ConversationsModule } from '../conversations/conversations.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ConversationsModule, AiModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
