import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesGateway } from './messages.gateway';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET')?.trim() ||
          process.env.JWT_SECRET?.trim();
        if (!secret) {
          throw new Error(
            'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. Application refuses to boot.',
          );
        }
        return {
          secret,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MessagesGateway, WsJwtGuard],
  exports: [MessagesGateway, WsJwtGuard],
})
export class MessagesModule {}
