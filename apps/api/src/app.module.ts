import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagesModule } from './messages/messages.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { TicketsModule } from './tickets/tickets.module';
import { TelegramModule } from './telegram/telegram.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { ToolModule } from './tools/tool.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../../.env'),
        path.resolve(__dirname, '../../.env'),
        '.env',
        '.env.local',
      ],
    }),
    PrismaModule,
    MessagesModule,
    HealthModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
