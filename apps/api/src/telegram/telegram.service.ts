import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AiAgentService } from '../ai/ai-agent.service';
import { ConversationChannel, ConversationStatus, MessageSenderType } from '@ai-support/types';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
    private aiAgentService: AiAgentService,
  ) {}

  async handleWebhookPayload(payload: any) {
    const message = payload.message || payload.edited_message;
    if (!message || !message.text) {
      return { status: 'ignored_non_text_payload' };
    }

    const chatId = String(message.chat.id);
    const userFirstName = message.from.first_name || 'Telegram User';
    const userLastName = message.from.last_name || '';
    const text = message.text;

    this.logger.log(`Received Telegram message from chatId ${chatId}: "${text}"`);

    // 1. Find or create Customer by telegramChatId
    let customer = await this.prisma.customer.findUnique({
      where: { telegramChatId: chatId },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          telegramChatId: chatId,
          name: `${userFirstName} ${userLastName}`.trim(),
        },
      });
    }

    // 2. Find or create active Telegram Conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        customerId: customer.id,
        channel: ConversationChannel.TELEGRAM,
        status: { in: [ConversationStatus.OPEN, ConversationStatus.AI_ACTIVE, ConversationStatus.WAITING_FOR_AGENT, ConversationStatus.HUMAN_ACTIVE] },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          customerId: customer.id,
          channel: ConversationChannel.TELEGRAM,
          status: ConversationStatus.AI_ACTIVE,
        },
      });
    }

    // 3. Save incoming customer message
    await this.conversationsService.addMessage(
      conversation.id,
      { content: text },
      MessageSenderType.CUSTOMER,
    );

    // 4. Trigger AI response if AI is active
    if (conversation.status === ConversationStatus.AI_ACTIVE) {
      const aiReply = await this.aiAgentService.processIncomingMessage(conversation.id, text);
      if (aiReply) {
        await this.sendTelegramMessage(chatId, aiReply);
      }
    }

    return { status: 'processed', conversationId: conversation.id };
  }

  async sendTelegramMessage(chatId: string, text: string) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken || botToken === 'your_telegram_bot_token_here') {
      this.logger.warn(`TELEGRAM_BOT_TOKEN unconfigured. Would send to ${chatId}: "${text}"`);
      return;
    }

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      this.logger.error(`Failed sending Telegram message to chatId ${chatId}`, err);
    }
  }
}
