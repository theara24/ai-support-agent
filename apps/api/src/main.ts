import * as dotenv from 'dotenv';
import * as path from 'path';

// Preload root .env before NestJS bootstrap
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

// Critical startup security validation: refuse to boot if JWT_SECRET is missing or empty
const startupJwtSecret = process.env.JWT_SECRET?.trim();
if (!startupJwtSecret) {
  throw new Error(
    'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. Application startup aborted.',
  );
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { corsOptions } from './common/config/cors.config';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3000;

  // Configure Socket.IO Redis Adapter for multi-instance scaling
  const configService = app.get(ConfigService);
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(configService);
  app.useWebSocketAdapter(redisIoAdapter);

  // Global Middlewares & Configuration
  app.enableCors(corsOptions);

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/health'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('AI Support Agent API')
    .setDescription('Production-Ready AI Customer Support Platform REST & WebSockets API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`🚀 NestJS API server running on port ${port}`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/docs`);
}

bootstrap();
