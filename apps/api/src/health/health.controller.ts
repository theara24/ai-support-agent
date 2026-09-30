import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@ApiTags('health')
@Controller(['health', 'api/health'])
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Public health check endpoint for API, Database, Redis, and AI Provider' })
  async getHealth() {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6380);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      const redis = new Redis({
        host: redisHost,
        port: Number(redisPort),
        password: redisPassword || undefined,
        connectTimeout: 1000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      redis.on('error', () => {});
      await redis.connect();
      await redis.ping();
      await redis.quit();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }

    const aiProvider = this.configService.get<string>('AI_PROVIDER', 'gemini');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const aiMode = this.configService.get<string>('AI_MODE') || process.env.AI_MODE;
    const isLiveAI = Boolean(
      geminiKey &&
      geminiKey !== 'your_gemini_api_key_here' &&
      geminiKey !== 'mock_key' &&
      aiMode !== 'DEMO_AI' &&
      aiProvider !== 'demo'
    );

    const isHealthy = dbStatus === 'connected';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        api: 'operational',
        database: dbStatus,
        redis: redisStatus,
        ai: {
          provider: aiProvider,
          mode: isLiveAI ? 'REAL_AI' : 'DEMO_AI',
          chatModel: isLiveAI ? (this.configService.get('GEMINI_MODEL') || 'gemini-flash-lite-latest') : 'demo-deterministic',
          embeddingModel: isLiveAI ? 'gemini-embedding-001' : 'demo-simulated',
        },
      },
    };
  }
}
