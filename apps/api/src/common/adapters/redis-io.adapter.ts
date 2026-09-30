import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(configService: ConfigService): Promise<boolean> {
    try {
      const host = configService.get<string>('REDIS_HOST', 'localhost');
      const port = Number(configService.get<number>('REDIS_PORT', 6380));
      const password = configService.get<string>('REDIS_PASSWORD');

      const pubClient = new Redis({
        host,
        port,
        password: password || undefined,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.warn(`Redis PubClient error: ${err.message}`);
      });
      subClient.on('error', (err) => {
        this.logger.warn(`Redis SubClient error: ${err.message}`);
      });

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(`✅ Socket.IO Redis adapter connected successfully (${host}:${port})`);
      return true;
    } catch (err: any) {
      this.logger.warn(
        `⚠️ Redis unavailable for Socket.IO adapter (${err.message}). Falling back to in-memory adapter.`,
      );
      this.adapterConstructor = null;
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
