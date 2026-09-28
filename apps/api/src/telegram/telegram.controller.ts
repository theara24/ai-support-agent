import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram Webhook Handler' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ) {
    const configuredSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    // If secret token is configured, enforce verification header match
    if (configuredSecret && configuredSecret !== secretToken) {
      throw new ForbiddenException('Invalid or missing Telegram webhook secret token');
    }

    return this.telegramService.handleWebhookPayload(payload);
  }
}
