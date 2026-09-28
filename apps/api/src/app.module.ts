import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { TicketsModule } from './tickets/tickets.module';
import { TelegramModule } from './telegram/telegram.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { ToolModule } from './tools/tool.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    KnowledgeBaseModule,
    TicketsModule,
    TelegramModule,
    AnalyticsModule,
    AiModule,
    ToolModule,
  ],
})
export class AppModule {}
