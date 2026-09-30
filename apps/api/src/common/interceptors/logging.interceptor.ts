import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (req as any)?.correlationId ||
      (req as any)?.requestId ||
      req?.headers['x-request-id'] ||
      'unknown';

    const method = req?.method;
    const url = req?.originalUrl || req?.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res?.statusCode || 200;
          this.logger.log(
            `[${correlationId}] ${method} ${url} ${statusCode} +${duration}ms`,
          );
        },
        error: (err: any) => {
          const duration = Date.now() - startTime;
          const statusCode = err?.status || 500;
          this.logger.warn(
            `[${correlationId}] ${method} ${url} ${statusCode} +${duration}ms - ${err.message || 'Error'}`,
          );
        },
      }),
    );
  }
}
