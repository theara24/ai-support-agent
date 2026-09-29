import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AiAgentService } from '../ai/ai-agent.service';
import { ConversationChannel, ConversationStatus, MessageSenderType } from '@ai-support/types';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private isPolling = false;
  private lastUpdateId = 0;
  private abortController: AbortController | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService,
    private aiAgentService: AiAgentService,
  ) {}

  async onModuleInit() {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') ||
      process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || botToken.trim() === '' || botToken === 'your_telegram_bot_token_here') {
      this.logger.log('ℹ️ Telegram bot token not configured. Telegram integration in standby mode.');
      return;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      if (data.ok) {
        this.logger.log(`🤖 Telegram Bot connected: @${data.result.username} (${data.result.first_name})`);

        const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
        if (webhookUrl && !webhookUrl.includes('your-domain.com')) {
          await this.registerWebhook(botToken, webhookUrl);
        } else {
          this.logger.log('🔄 No public webhook URL configured. Starting local long-polling listener...');
          this.startLongPolling(botToken);
        }
      } else {
        this.logger.warn(`Telegram getMe check failed: ${data.description}`);
      }
    } catch (err: any) {
      this.logger.warn(`Telegram initialization check failed: ${err.message}`);
    }
  }

  onModuleDestroy() {
    this.isPolling = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async registerWebhook(botToken: string, webhookUrl: string) {
    const secret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        this.logger.log(`📡 Telegram Webhook registered successfully: ${webhookUrl}`);
      } else {
        this.logger.warn(`Failed registering Telegram webhook: ${data.description}`);
      }
    } catch (err: any) {
      this.logger.warn(`Telegram setWebhook error: ${err.message}`);
    }
  }

  private async startLongPolling(botToken: string) {
    if (this.isPolling) return;
    this.isPolling = true;

    // Delete existing webhook so getUpdates functions properly
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    } catch {}

    const pollLoop = async () => {
      while (this.isPolling) {
        try {
          this.abortController = new AbortController();
          const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=20`;
          const res = await fetch(url, { signal: this.abortController.signal });
          const data = await res.json();

          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              this.lastUpdateId = update.update_id;
              await this.handleWebhookPayload(update).catch((e) => {
                this.logger.error(`Error handling Telegram update ${update.update_id}:`, e);
              });
            }
          } else if (!data.ok) {
            this.logger.warn(`Telegram getUpdates error: ${data.description}`);
            await new Promise((r) => setTimeout(r, 4000));
          }
        } catch (err: any) {
          if (!this.isPolling) break;
          // Wait 3 seconds on network error before retrying
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };

    pollLoop();
  }

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

    // Find default organization to associate customer and conversation
    const defaultOrg =
      (await this.prisma.organization.findFirst({
        where: { slug: 'acme-support' },
      })) || (await this.prisma.organization.findFirst());
    const orgId = defaultOrg?.id;

    // 1. Find or create Customer by telegramChatId
    let customer = await this.prisma.customer.findUnique({
      where: { telegramChatId: chatId },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          telegramChatId: chatId,
          name: `${userFirstName} ${userLastName}`.trim(),
          organizationId: orgId,
        },
      });
    } else if (!customer.organizationId && orgId) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { organizationId: orgId },
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
          organizationId: orgId,
          channel: ConversationChannel.TELEGRAM,
          status: ConversationStatus.AI_ACTIVE,
        },
      });
    } else if (!conversation.organizationId && orgId) {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { organizationId: orgId },
      });
    }

    // 3. Save incoming customer message (skip internal auto-trigger to avoid double AI invocation)
    await this.conversationsService.addMessage(
      conversation.id,
      { content: text },
      MessageSenderType.CUSTOMER,
      undefined,
      true,
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

  /**
   * Converts standard markdown syntax into Telegram-supported HTML tags:
   * <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>code block</pre>, and clean bullet points.
   */
  private formatTelegramHtml(text: string): string {
    if (!text) return '';

    // 1. Escape HTML special characters
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Multiline code blocks
    out = out.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, '<pre>$1</pre>');

    // 3. Inline code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Bold-italic ***text***
    out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>');

    // 5. Bold **text**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

    // 6. Bullet lists: turn `* item` or `- item` into `• item`
    out = out.replace(/^\s*[\*\-]\s+(.*)$/gm, '• $1');

    // 7. Italic *text* or _text_
    out = out.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<i>$2</i>$3');
    out = out.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<i>$2</i>$3');

    return out;
  }

  async sendTelegramMessage(chatId: string, text: string) {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') ||
      process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || botToken.trim() === '' || botToken === 'your_telegram_bot_token_here') {
      this.logger.warn(`TELEGRAM_BOT_TOKEN unconfigured. Would send to ${chatId}: "${text}"`);
      return;
    }

    const htmlContent = this.formatTelegramHtml(text);

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlContent,
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        // Fallback: strip markdown symbols (*, _, `, #) so text renders clean without raw asterisks
        const cleanPlain = text.replace(/[*_`#]/g, '');
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: cleanPlain,
          }),
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed sending Telegram message to chatId ${chatId}: ${err.message}`);
    }
  }
}
