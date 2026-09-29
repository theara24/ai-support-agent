import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAgentTool, ToolExecutionContext } from '../tool.interface';
import { LLMToolDefinition } from '@ai-support/types';

@Injectable()
export class GetCurrentTimeTool implements IAgentTool {
  private readonly logger = new Logger(GetCurrentTimeTool.name);

  readonly definition: LLMToolDefinition = {
    name: 'getCurrentTime',
    description:
      'Retrieves the real-time server and local clock date, time, and timezone. Use whenever a user asks for current time, current date, or what day it is.',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description:
            'Optional IANA timezone string (e.g., "Asia/Phnom_Penh", "America/New_York", "UTC"). Defaults to company timezone.',
        },
      },
    },
  };

  constructor(private configService: ConfigService) {}

  async execute(
    params: { timezone?: string },
    _context: ToolExecutionContext,
  ): Promise<{
    iso: string;
    readable: string;
    timezone: string;
    date: string;
    time: string;
    dayOfWeek: string;
  }> {
    const now = new Date();
    const defaultTz = this.configService.get<string>('COMPANY_TIMEZONE') || 'Asia/Phnom_Penh';
    let tz = (params?.timezone || defaultTz).trim();

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      this.logger.warn(`Invalid timezone provided: "${tz}", falling back to ${defaultTz}`);
      tz = defaultTz;
    }

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const readableFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
    });

    // ISO-like date string for local timezone (YYYY-MM-DD)
    const yearFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' });
    const monthFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: '2-digit' });
    const dayOfMonthFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: '2-digit' });

    const formattedDate = `${yearFormatter.format(now)}-${monthFormatter.format(now)}-${dayOfMonthFormatter.format(now)}`;
    const timeStr = timeFormatter.format(now);
    const readable = readableFormatter.format(now);
    const dayOfWeek = dayFormatter.format(now);

    return {
      iso: now.toISOString(),
      readable,
      timezone: tz,
      date: formattedDate,
      time: timeStr,
      dayOfWeek,
    };
  }
}
